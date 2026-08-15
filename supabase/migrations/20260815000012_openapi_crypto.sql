-- ============================================================
-- Capitech Bank — 0012: Open API + Crypto + security hardening
-- Paste into: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ------------------------------------------------------------
-- 1) api_keys: bind keys to an owner (customer or organization)
-- ------------------------------------------------------------
alter table public.api_keys
  add column if not exists owner_type text check (owner_type in ('customer', 'organization')),
  add column if not exists owner_id uuid;

create index if not exists api_keys_owner_idx on public.api_keys (owner_type, owner_id);

-- ------------------------------------------------------------
-- 2) SECURITY HARDENING — post_journal ownership enforcement
--    Customers may only post journal lines on accounts they own.
--    Staff and system (service-role / cron, p_actor null) bypass.
-- ------------------------------------------------------------
create or replace function public.post_journal(
  p_description text,
  p_lines jsonb,
  p_reference_type text default null,
  p_reference_id text default null,
  p_entry_date timestamptz default now(),
  p_tenant uuid default null,
  p_actor uuid default auth.uid()
)
returns public.gl_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := coalesce(p_tenant, public.current_tenant_id());
  v_entry public.gl_entries;
  v_line jsonb;
  v_kind text;
  v_account_id uuid;
  v_coa_id uuid;
  v_currency char(3);
  v_debit numeric(20,2);
  v_credit numeric(20,2);
  v_memo text;
  v_dr_sum numeric(20,2) := 0;
  v_cr_sum numeric(20,2) := 0;
  v_bal public.accounts%rowtype;
  v_normal_side text;
begin
  if v_tenant is null then
    raise exception 'Not authenticated';
  end if;
  if jsonb_array_length(p_lines) = 0 then
    raise exception 'Journal must contain at least one line';
  end if;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_kind := v_line ->> 'account_kind';
    v_account_id := (v_line ->> 'account_id')::uuid;
    v_currency := v_line ->> 'currency';
    v_debit := coalesce((v_line ->> 'debit')::numeric, 0);
    v_credit := coalesce((v_line ->> 'credit')::numeric, 0);
    v_memo := v_line ->> 'memo';

    if v_kind = 'customer' then
      select * into v_bal from public.accounts where id = v_account_id;
      if v_bal is null then
        raise exception 'Account % not found', v_account_id;
      end if;
      if v_bal.tenant_id <> v_tenant then
        raise exception 'Account % not in tenant', v_account_id;
      end if;
      -- OWNERSHIP ENFORCEMENT (new): customer callers can only move their own money
      if p_actor is not null
         and not public.is_staff()
         and not public.is_account_owner(v_account_id) then
        raise exception 'Account % is not owned by the caller', v_account_id;
      end if;
      if v_bal.currency <> v_currency then
        raise exception 'Account % currency mismatch (% <> %)', v_account_id, v_bal.currency, v_currency;
      end if;
      if v_bal.status <> 'active' or v_bal.frozen then
        raise exception 'Account % is not available for transactions', v_account_id;
      end if;
      if v_debit > 0 then
        if v_debit > v_bal.available_balance + 0.0001 then
          raise exception 'Insufficient funds on account % (available % < debit %)', v_account_id, v_bal.available_balance, v_debit;
        end if;
      end if;
      v_dr_sum := v_dr_sum + v_debit;
      v_cr_sum := v_cr_sum + v_credit;
    elsif v_kind = 'coa' then
      v_coa_id := v_account_id;
      if not exists (
        select 1 from public.coa_accounts
        where id = v_coa_id and tenant_id = v_tenant
      ) then
        raise exception 'COA account % not found', v_coa_id;
      end if;
      v_dr_sum := v_dr_sum + v_debit;
      v_cr_sum := v_cr_sum + v_credit;
    else
      raise exception 'Invalid account_kind: %', v_kind;
    end if;
  end loop;

  if v_dr_sum <> v_cr_sum then
    raise exception 'Journal does not balance: debits % <> credits %', v_dr_sum, v_cr_sum;
  end if;

  insert into public.gl_entries (
    tenant_id, journal_no, entry_date, post_date, description,
    reference_type, reference_id, status, created_by, approved_by, approved_at
  )
  values (
    v_tenant, public.next_journal_no(), p_entry_date, now(), p_description,
    p_reference_type, p_reference_id, 'posted', p_actor, p_actor, now()
  )
  returning * into v_entry;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_kind := v_line ->> 'account_kind';
    v_account_id := (v_line ->> 'account_id')::uuid;
    v_currency := v_line ->> 'currency';
    v_debit := coalesce((v_line ->> 'debit')::numeric, 0);
    v_credit := coalesce((v_line ->> 'credit')::numeric, 0);
    v_memo := v_line ->> 'memo';

    insert into public.gl_entry_lines (
      tenant_id, entry_id, coa_account_id, customer_account_id,
      currency, debit, credit, memo
    )
    values (
      v_tenant, v_entry.id,
      case when v_kind = 'coa' then v_account_id else null end,
      case when v_kind = 'customer' then v_account_id else null end,
      v_currency, v_debit, v_credit, v_memo
    );

    if v_kind = 'customer' then
      update public.accounts
      set ledger_balance = ledger_balance - v_debit + v_credit,
          available_balance = available_balance - v_debit + v_credit,
          updated_at = now()
      where id = v_account_id;
    else
      select normal_side into v_normal_side
      from public.coa_accounts where id = v_account_id;

      insert into public.balances (tenant_id, coa_account_id, currency)
      values (v_tenant, v_account_id, v_currency)
      on conflict (coa_account_id, currency) do nothing;

      update public.balances
      set ledger_balance = ledger_balance +
            case when v_normal_side = 'debit' then v_debit - v_credit
                 else v_credit - v_debit end,
          available_balance = available_balance +
            case when v_normal_side = 'debit' then v_debit - v_credit
                 else v_credit - v_debit end,
          last_transaction_at = now(),
          updated_at = now()
      where coa_account_id = v_account_id and currency = v_currency;
    end if;
  end loop;

  return v_entry;
end;
$$;

-- ------------------------------------------------------------
-- 3) Crypto: price cache + order execution engine
-- ------------------------------------------------------------
create table if not exists public.crypto_prices (
  asset text primary key,
  price_usd numeric(24,12),
  change_24h numeric(8,4),
  market_cap numeric(30,2),
  updated_at timestamptz not null default now()
);

create or replace function public.execute_crypto_order(
  p_account_id uuid,
  p_side text,
  p_asset text,
  p_amount_fiat numeric(20,2),
  p_price numeric(24,12)
)
returns public.crypto_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_account public.accounts%rowtype;
  v_amount_asset numeric(36,18);
  v_coa_crypto uuid;
  v_order public.crypto_orders;
  v_wallet public.crypto_wallets%rowtype;
begin
  if v_tenant is null then
    raise exception 'Not authenticated';
  end if;
  if p_side not in ('buy', 'sell') then
    raise exception 'side must be buy or sell';
  end if;
  if p_amount_fiat <= 0 or p_price <= 0 then
    raise exception 'amount and price must be positive';
  end if;

  select * into v_account from public.accounts
  where id = p_account_id and tenant_id = v_tenant;
  if v_account is null then
    raise exception 'Account not found';
  end if;

  v_amount_asset := round(p_amount_fiat / p_price, 8);

  select id into v_coa_crypto from public.coa_accounts
  where tenant_id = v_tenant and code = '2300';

  -- ledger: buy = debit fiat / credit crypto liability; sell = reverse
  perform public.post_journal(
    case when p_side = 'buy' then 'Crypto purchase ' else 'Crypto sale ' end || p_asset,
    jsonb_build_array(
      jsonb_build_object('account_kind', 'customer', 'account_id', p_account_id,
                         'currency', v_account.currency,
                         'debit', case when p_side = 'buy' then p_amount_fiat else 0 end,
                         'credit', case when p_side = 'sell' then p_amount_fiat else 0 end,
                         'memo', p_asset),
      jsonb_build_object('account_kind', 'coa', 'account_id', v_coa_crypto,
                         'currency', v_account.currency,
                         'debit', case when p_side = 'sell' then p_amount_fiat else 0 end,
                         'credit', case when p_side = 'buy' then p_amount_fiat else 0 end,
                         'memo', p_asset)
    ),
    'crypto_order', null,
    now(), v_tenant, auth.uid()
  );

  -- wallet balance update
  select * into v_wallet from public.crypto_wallets
  where account_id = p_account_id and asset = upper(p_asset);
  if v_wallet is null then
    if p_side = 'sell' then
      raise exception 'No wallet for % — nothing to sell', p_asset;
    end if;
    insert into public.crypto_wallets (tenant_id, account_id, asset, balance, address)
    values (v_tenant, p_account_id, upper(p_asset), 0, '0x' || encode(extensions.gen_random_bytes(20), 'hex'));
    select * into v_wallet from public.crypto_wallets
    where account_id = p_account_id and asset = upper(p_asset);
  end if;

  if p_side = 'sell' and v_wallet.balance < v_amount_asset then
    raise exception 'Insufficient % balance (available % < %)', p_asset, v_wallet.balance, v_amount_asset;
  end if;

  update public.crypto_wallets
  set balance = balance + case when p_side = 'buy' then v_amount_asset else -v_amount_asset end,
      updated_at = now()
  where id = v_wallet.id;

  insert into public.crypto_orders (
    tenant_id, account_id, order_type, asset, side,
    amount_fiat, amount_asset, price, status
  ) values (
    v_tenant, p_account_id, 'market', upper(p_asset), p_side,
    p_amount_fiat, v_amount_asset, p_price, 'filled'
  )
  returning * into v_order;

  return v_order;
end;
$$;

grant execute on function public.post_journal(text, jsonb, text, text, timestamptz, uuid, uuid) to authenticated;
grant execute on function public.execute_crypto_order(uuid, text, text, numeric, numeric) to authenticated;

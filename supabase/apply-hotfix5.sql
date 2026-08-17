-- =====================================================================
-- Capitech Bank — HOTFIX 5 (single paste) — CONSOLIDATED SECURITY BUNDLE
-- Supersedes apply-hotfix3.sql and apply-hotfix4.sql.
-- Paste into: Supabase Dashboard → SQL Editor → Run (full bundle).
-- Paste apply-hotfix5.sql (this file). The anon crypto_prices policy is INCLUDED
-- below — no separate 0014 paste required.
--
-- Scope: S-1..S-6, S-9, M-1, M-4, L-1, L-2, L-3
--   S-1  profiles.role privilege escalation  -> protect_profile_privileges trigger
--   S-2  KYC self-approval                    -> protect_kyc_fields trigger
--   S-3  balance tampering                    -> protect_account_balances trigger
--   S-4  post_journal authz via p_actor       -> auth.uid() enforcement
--   S-5  crypto client-price minting          -> server-side re-pricing + slippage
--   S-6  execute_payment authz/maker-checker  -> auth.uid() enforcement
--   S-9  crypto_prices RLS                    -> SELECT for anon + authenticated (anon policy included)
--   M-1  audit log spoofing                   -> service-role-only inserts
--   M-4  tenant/org over-disclosure           -> tighten policies
--   L-1  volatile next_journal_no/next_order_no
--   L-2  execute_payment accepts 'authorized' legacy orders
--   L-3  storage policy scoping (kyc + statements)
--
-- Preconditions: migrations 0001..0012 (or apply-0012.sql) applied.
-- Idempotent-ish: create-or-replace + drop-if-exists throughout.
-- =====================================================================

-- =====================================================================
-- S-3 / S-4 / S-6 helper — privileged caller predicate
-- Privileged = system context (no JWT: pg_cron / SQL editor / postgres),
--              service role, or any back-office staff role.
-- Used consistently by post_journal, execute_payment, execute_crypto_order
-- and the three protection triggers.
-- =====================================================================
create or replace function public.is_privileged_caller()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_jwt jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
begin
  -- No JWT at all => system context (pg_cron, SQL editor, postgres owner).
  if v_jwt is null then
    return true;
  end if;

  -- Server-side service role (SUPABASE_SERVICE_ROLE_KEY).
  if v_jwt ->> 'role' = 'service_role' then
    return true;
  end if;

  -- Back-office staff (staff_* roles or super_admin).
  if public.is_staff() then
    return true;
  end if;

  return false;
end;
$$;

grant execute on function public.is_privileged_caller() to authenticated;

-- =====================================================================
-- S-1 — profiles privilege escalation (CRITICAL)
-- Hard guarantee: role / tenant_id may change ONLY via system context (no JWT)
-- or the service role. JWT staff (even staff_admin) cannot bypass — a
-- staff_teller could otherwise escalate their own profiles.role to super_admin.
-- (profiles has no is_staff column — staff is derived via is_staff().)
-- =====================================================================
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Role / tenant reassignment is reserved for system context (no JWT:
  -- pg_cron, SQL editor, postgres) and the service role only. JWT-authenticated
  -- staff (even staff_admin) must NOT bypass — a staff_teller could otherwise
  -- escalate their own profiles.role to super_admin.
  if new.role is distinct from old.role
     or new.tenant_id is distinct from old.tenant_id then
    if not (
      auth.role() = 'service_role'
      or current_setting('request.jwt.claims', true) is null
      or current_setting('request.jwt.claims', true) = ''
    ) then
      raise exception 'Role and tenant assignment cannot be changed by the account owner';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_privileges on public.profiles;
create trigger protect_profile_privileges
  before update on public.profiles
  for each row execute function public.protect_profile_privileges();

-- =====================================================================
-- S-2 — KYC self-approval (CRITICAL)
-- Non-privileged callers may not touch KYC decision fields, tenant or
-- the owning profile. (customers has no approval timestamp columns —
-- verified in 0003; the protected set is status/level/pep/sanctioned/risk.)
-- =====================================================================
create or replace function public.protect_kyc_fields()
returns trigger
language plpgsql
as $$
begin
  -- System / internal writes (service role, SQL editor, SECURITY DEFINER
  -- contexts) are allowed through without relying on function grants.
  if current_user <> 'authenticated' then
    return new;
  end if;

  if public.is_privileged_caller() then
    return new;
  end if;

  if new.kyc_status is distinct from old.kyc_status
     or new.kyc_level is distinct from old.kyc_level
     or new.is_pep is distinct from old.is_pep
     or new.is_sanctioned is distinct from old.is_sanctioned
     or new.risk_score is distinct from old.risk_score
     or new.tenant_id is distinct from old.tenant_id
     or new.profile_id is distinct from old.profile_id then
    raise exception 'KYC decision fields are read-only for customers';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_kyc_fields on public.customers;
create trigger protect_kyc_fields
  before update on public.customers
  for each row execute function public.protect_kyc_fields();

-- =====================================================================
-- S-3 — balance tampering (CRITICAL)
-- Non-privileged callers may only change nickname / updated_at.
-- Balances move ONLY via post_journal (SECURITY DEFINER): its internal
-- account UPDATE runs as the function owner (current_user <> 'authenticated')
-- and therefore bypasses this guard. Service-role requests also bypass.
-- =====================================================================
create or replace function public.protect_account_balances()
returns trigger
language plpgsql
as $$
begin
  -- Internal writes (SECURITY DEFINER functions such as post_journal run as
  -- the postgres owner) and service-role requests are allowed through.
  if current_user <> 'authenticated' then
    return new;
  end if;

  -- Staff via PostgREST are allowed (back-office balance corrections).
  if public.is_privileged_caller() then
    return new;
  end if;

  -- Plain authenticated customer: balances / limits / identity columns are
  -- read-only. Only nickname (and the touch_updated_at-managed updated_at)
  -- may change.
  if new.id is distinct from old.id
     or new.tenant_id is distinct from old.tenant_id
     or new.account_no is distinct from old.account_no
     or new.iban is distinct from old.iban
     or new.swift_bic is distinct from old.swift_bic
     or new.product_id is distinct from old.product_id
     or new.coa_account_id is distinct from old.coa_account_id
     or new.owner_type is distinct from old.owner_type
     or new.owner_id is distinct from old.owner_id
     or new.currency is distinct from old.currency
     or new.status is distinct from old.status
     or new.ledger_balance is distinct from old.ledger_balance
     or new.available_balance is distinct from old.available_balance
     or new.daily_transfer_limit is distinct from old.daily_transfer_limit
     or new.frozen is distinct from old.frozen
     or new.opened_at is distinct from old.opened_at
     or new.closed_at is distinct from old.closed_at
     or new.created_at is distinct from old.created_at then
    raise exception 'Account balances and settings are read-only for customers; balances move only via post_journal()';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_account_balances on public.accounts;
create trigger protect_account_balances
  before update on public.accounts
  for each row execute function public.protect_account_balances();

-- =====================================================================
-- S-4 — post_journal authorization (CRITICAL)
-- Authorization keys on the JWT (auth.uid()), never on the caller-supplied
-- p_actor argument. p_actor is retained ONLY as the audit trail
-- (gl_entries.created_by / approved_by).
-- Signature unchanged (CTO coordination).
-- =====================================================================
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
  v_caller uuid := auth.uid();          -- trusted identity from the JWT
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

      -- S-4: authorization on auth.uid(), never on p_actor.
      -- Privileged callers (staff / service role / system) bypass ownership.
      if not public.is_privileged_caller() then
        if public.is_account_owner(v_account_id) is not true then
          raise exception 'Account % is not owned by the caller', v_account_id;
        end if;
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

-- =====================================================================
-- S-6 + L-2 — execute_payment authorization, maker–checker, legacy status
-- (hotfix3 §1 v_fee_lines uuid fix retained)
-- Signature unchanged (CTO coordination).
--   deposit / withdrawal      : staff or service role only (kills sandbox mint)
--   internal_transfer / own   : creator (auth.uid()) OR privileged caller
--   maker–checker             : p_approve cannot be the creator (auth.uid())
--   status guard              : accepts 'pending' AND legacy 'authorized'
-- =====================================================================
create or replace function public.execute_payment(
  p_order_id uuid,
  p_actor uuid default auth.uid(),
  p_approve boolean default true
)
returns public.payment_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_actor uuid := auth.uid();           -- trusted identity from the JWT
  v_order public.payment_orders%rowtype;
  v_from public.accounts%rowtype;
  v_to public.accounts%rowtype;
  v_nostro uuid;
  v_lines jsonb;
  v_fee_lines uuid;
  v_fee_amount numeric(20,2);
  v_dest_account uuid;
begin
  if v_tenant is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_order from public.payment_orders
  where id = p_order_id and tenant_id = v_tenant;
  if v_order is null then
    raise exception 'Order not found';
  end if;

  -- L-2: accept legacy 'authorized' orders as well as 'pending'
  if v_order.status not in ('pending', 'authorized') then
    raise exception 'Order is not executable (status: %)', v_order.status;
  end if;

  -- S-6: authorization on auth.uid(), never on caller-supplied p_actor.
  if v_order.tx_type in ('deposit', 'withdrawal') then
    if not public.is_privileged_caller() then
      raise exception 'Only staff can execute deposit/withdrawal orders';
    end if;
  elsif v_order.tx_type in ('internal_transfer', 'own_transfer') then
    if not (v_order.created_by = v_actor or public.is_privileged_caller()) then
      raise exception 'Not authorized to execute this order';
    end if;
  end if;

  -- maker–checker: the approving actor must differ from the creator.
  if p_approve and v_order.created_by = v_actor then
    raise exception 'Maker-checker violation: a payment cannot be approved by its creator';
  end if;

  -- locate the nostro (settlement) account for the currency
  select c.id into v_nostro
  from public.coa_accounts c
  where c.tenant_id = v_tenant and c.code = '1100';

  if v_order.tx_type in ('internal_transfer', 'own_transfer') then
    select * into v_from from public.accounts where id = v_order.from_account_id;
    if v_from is null then
      raise exception 'Source account not found';
    end if;
    select * into v_to from public.accounts where id = v_order.to_account_id;
    if v_to is null then
      select * into v_to from public.accounts
      where account_no = coalesce(nullif(v_order.to_iban, ''), '')
         or iban = coalesce(nullif(v_order.to_iban, ''), '');
      if v_to is null then
        raise exception 'Destination account not found: %', v_order.to_iban;
      end if;
    end if;

    v_lines := jsonb_build_array(
      jsonb_build_object('account_kind', 'customer', 'account_id', v_order.from_account_id, 'currency', v_order.currency, 'debit', v_order.amount, 'credit', 0, 'memo', v_order.narration),
      jsonb_build_object('account_kind', 'customer', 'account_id', v_to.id, 'currency', v_order.currency, 'debit', 0, 'credit', v_order.amount, 'memo', v_order.narration)
    );

    v_fee_amount := least(greatest(v_order.amount * 0.005, 0.50), 20.00);
    select id into v_fee_lines from public.coa_accounts where tenant_id = v_tenant and code = '4000';
    v_lines := v_lines ||
      jsonb_build_array(
        jsonb_build_object('account_kind', 'customer', 'account_id', v_order.from_account_id, 'currency', v_order.currency, 'debit', v_fee_amount, 'credit', 0, 'memo', 'Transfer fee'),
        jsonb_build_object('account_kind', 'coa', 'account_id', v_fee_lines, 'currency', v_order.currency, 'debit', 0, 'credit', v_fee_amount, 'memo', 'Transfer fee')
      );

    perform public.post_journal(
      'Payment ' || v_order.order_no || ' — ' || coalesce(v_order.reference, 'transfer'),
      v_lines,
      'payment_order', v_order.order_no::text,
      now(), null, v_actor
    );

  elsif v_order.tx_type = 'deposit' then
    select * into v_from from public.accounts where id = v_order.from_account_id;
    if v_from is null then
      raise exception 'Destination account not found';
    end if;
    v_lines := jsonb_build_array(
      jsonb_build_object('account_kind', 'coa', 'account_id', v_nostro, 'currency', v_order.currency, 'debit', v_order.amount, 'credit', 0, 'memo', 'Sandbox deposit in'),
      jsonb_build_object('account_kind', 'customer', 'account_id', v_from.id, 'currency', v_order.currency, 'debit', 0, 'credit', v_order.amount, 'memo', 'Deposit')
    );
    perform public.post_journal(
      'Deposit ' || v_order.order_no,
      v_lines,
      'payment_order', v_order.order_no::text,
      now(), null, v_actor
    );

  elsif v_order.tx_type = 'withdrawal' then
    select * into v_from from public.accounts where id = v_order.from_account_id;
    if v_from is null then
      raise exception 'Source account not found';
    end if;
    v_lines := jsonb_build_array(
      jsonb_build_object('account_kind', 'customer', 'account_id', v_from.id, 'currency', v_order.currency, 'debit', v_order.amount, 'credit', 0, 'memo', 'Withdrawal'),
      jsonb_build_object('account_kind', 'coa', 'account_id', v_nostro, 'currency', v_order.currency, 'debit', 0, 'credit', v_order.amount, 'memo', 'Sandbox withdrawal out')
    );
    perform public.post_journal(
      'Withdrawal ' || v_order.order_no,
      v_lines,
      'payment_order', v_order.order_no::text,
      now(), null, v_actor
    );
  else
    raise exception 'Execution for tx_type % not implemented yet', v_order.tx_type;
  end if;

  update public.payment_orders
  set status = 'posted',
      approved_by = case when p_approve then v_actor else approved_by end,
      approved_at = case when p_approve then now() else approved_at end,
      executed_at = now(),
      fee_amount = case when v_order.tx_type in ('internal_transfer', 'own_transfer') then v_fee_amount else fee_amount end,
      fee_currency = case when v_order.tx_type in ('internal_transfer', 'own_transfer') then v_order.currency else fee_currency end,
      updated_at = now()
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

-- =====================================================================
-- S-5 — execute_crypto_order: server-side re-pricing + ownership (CRITICAL)
-- (hotfix4 form retained: extensions.gen_random_bytes; no updated_at on
-- crypto_wallets — that column does not exist)
-- The client p_price is used ONLY for the 2% slippage check; the stored
-- crypto_prices.price_usd is authoritative for pricing and the order record.
-- Signature unchanged (CTO coordination).
-- =====================================================================
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
  v_caller uuid := auth.uid();
  v_account public.accounts%rowtype;
  v_price numeric(24,12);
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

  -- S-5: the account must belong to the JWT caller (not just the tenant).
  if not public.is_privileged_caller()
     and public.is_account_owner(p_account_id) is not true then
    raise exception 'Account is not owned by the caller';
  end if;

  -- S-5: authoritative server-side price from the price cache.
  -- (Assumes the feed stores uppercase symbols, e.g. 'BTC' — consistent
  -- with crypto_wallets.asset / crypto_orders.asset.)
  select price_usd into v_price
  from public.crypto_prices
  where asset = upper(p_asset);
  -- Guard against zero / missing price: a 0 (CoinGecko fallback `?? 0`) would
  -- make the slippage division below divide-by-zero.
  if v_price is null or v_price <= 0 then
    raise exception 'No valid market price for asset — retry later';
  end if;

  -- 2% slippage bound vs the caller-supplied reference price.
  if abs(p_price - v_price) / v_price > 0.02 then
    raise exception 'Price moved, retry';
  end if;

  v_amount_asset := round(p_amount_fiat / v_price, 8);

  select id into v_coa_crypto from public.coa_accounts
  where tenant_id = v_tenant and code = '2300';

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
    now(), v_tenant, v_caller
  );

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
  set balance = balance + case when p_side = 'buy' then v_amount_asset else -v_amount_asset end
  where id = v_wallet.id;

  insert into public.crypto_orders (
    tenant_id, account_id, order_type, asset, side,
    amount_fiat, amount_asset, price, status
  ) values (
    v_tenant, p_account_id, 'market', upper(p_asset), p_side,
    p_amount_fiat, v_amount_asset, v_price, 'filled'
  )
  returning * into v_order;

  return v_order;
end;
$$;

-- =====================================================================
-- S-9 — crypto_prices RLS: public price read; writes only via service role
-- (service_role bypasses RLS, so no INSERT/UPDATE policy is needed for it)
-- =====================================================================
alter table public.crypto_prices enable row level security;

drop policy if exists "crypto_prices_select_authenticated" on public.crypto_prices;
create policy "crypto_prices_select_authenticated" on public.crypto_prices
  for select to authenticated
  using (true);

drop policy if exists "crypto_prices_select_anon" on public.crypto_prices;
create policy "crypto_prices_select_anon" on public.crypto_prices
  for select to anon
  using (true);

-- =====================================================================
-- M-1 — audit log spoofing: service-role-only writes
-- =====================================================================
drop policy if exists "logs_insert_authenticated" on public.operation_logs;

drop policy if exists "logs_insert_service" on public.operation_logs;
create policy "logs_insert_service" on public.operation_logs
  for insert to service_role
  with check (true);

revoke execute on function public.log_operation(text, text, text, jsonb) from authenticated;
-- Functions default to PUBLIC execute — revoke the blanket grant as well.
revoke execute on function public.log_operation(text, text, text, jsonb) from public;

-- =====================================================================
-- M-4 — tenant / organization over-disclosure
-- =====================================================================
drop policy if exists "tenants_select_authenticated" on public.tenants;
create policy "tenants_select_authenticated" on public.tenants
  for select to authenticated
  using (id = public.current_tenant_id());

-- organizations has no created_by column (verified in 0003) — scope by tenant.
drop policy if exists "orgs_insert_authenticated" on public.organizations;
create policy "orgs_insert_authenticated" on public.organizations
  for insert to authenticated
  with check (tenant_id = public.current_tenant_id());

-- =====================================================================
-- L-1 — volatile sequence-number generators (call nextval(), not stable)
-- =====================================================================
create or replace function public.next_journal_no()
returns text
language sql
volatile
as $$
  select 'GL-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.journal_seq')::text, 6, '0')
$$;

create or replace function public.next_order_no()
returns text
language sql
volatile
as $$
  select 'PAY-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.payment_seq')::text, 6, '0')
$$;

-- =====================================================================
-- L-3 — storage policy scoping
-- =====================================================================
-- KYC read: the staff bypass now applies only within the kyc-documents bucket
drop policy if exists "kyc_storage_read_own" on storage.objects;
create policy "kyc_storage_read_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'kyc-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_staff()
    )
  );

-- statements: add an owner-read policy (assumes objects are stored under a
-- folder named by the owner's auth.uid()::text — same convention as KYC)
drop policy if exists "statements_storage_read_own" on storage.objects;
create policy "statements_storage_read_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'statements'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_staff()
    )
  );

-- =====================================================================
-- Grants (idempotent re-grants for recreated functions)
-- =====================================================================
grant execute on function public.post_journal(text, jsonb, text, text, timestamptz, uuid, uuid) to authenticated;
grant execute on function public.execute_payment(uuid, uuid, boolean) to authenticated;
grant execute on function public.execute_crypto_order(uuid, text, text, numeric, numeric) to authenticated;

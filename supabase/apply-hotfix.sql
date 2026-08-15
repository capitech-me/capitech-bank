-- ============================================================
-- Capitech Bank — HOTFIX + IBAN STANDARD (single paste)
-- Paste into: Supabase Dashboard → SQL Editor → Run
-- Recreates: post_journal, execute_payment, simulate_card_purchase
-- Adds: standards-compliant IBAN generation + backfill
-- ============================================================

---- recreate post_journal (rowtype fix) ----
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
  v_available numeric(20,2);
begin
  if v_tenant is null then
    raise exception 'Not authenticated';
  end if;
  if jsonb_array_length(p_lines) = 0 then
    raise exception 'Journal must contain at least one line';
  end if;

  -- Validate lines & compute per-currency balances (simple: whole journal per currency)
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

  -- Create the entry
  insert into public.gl_entries (
    tenant_id, journal_no, entry_date, post_date, description,
    reference_type, reference_id, status, created_by, approved_by, approved_at
  )
  values (
    v_tenant, public.next_journal_no(), p_entry_date, now(), p_description,
    p_reference_type, p_reference_id, 'posted', p_actor, p_actor, now()
  )
  returning * into v_entry;

  -- Post lines
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

---- recreate execute_payment (alias fix) ----
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
  v_order public.payment_orders%rowtype;
  v_from public.accounts%rowtype;
  v_to public.accounts%rowtype;
  v_nostro uuid;
  v_lines jsonb;
  v_fee_lines jsonb;
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
  if v_order.status <> 'pending' then
    raise exception 'Order is not pending (status: %)', v_order.status;
  end if;

  -- maker–checker: creator cannot approve their own payment
  if p_approve and v_order.created_by = p_actor then
    raise exception 'Maker–checker: a payment cannot be approved by its creator';
  end if;

  -- locate the nostro (settlement) account for the currency
  select c.id into v_nostro
  from public.coa_accounts c
  where c.tenant_id = v_tenant and c.code = '1100';

  if v_order.tx_type in ('internal_transfer', 'own_transfer') then
    -- internal: debit source, credit destination (both customer accounts)
    select * into v_from from public.accounts where id = v_order.from_account_id;
    if v_from is null then
      raise exception 'Source account not found';
    end if;
    select * into v_to from public.accounts where id = v_order.to_account_id;
    if v_to is null then
      -- resolve by account_no
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

    -- fee: 0.5% capped at 20 units, charged to sender, credited to Fee Income
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
      now(), null, p_actor
    );

  elsif v_order.tx_type = 'deposit' then
    -- sandbox top-up: debit nostro, credit customer account
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
      now(), null, p_actor
    );

  elsif v_order.tx_type = 'withdrawal' then
    -- sandbox cash-out: debit customer, credit nostro
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
      now(), null, p_actor
    );
  else
    raise exception 'Execution for tx_type % not implemented yet', v_order.tx_type;
  end if;

  update public.payment_orders
  set status = 'posted',
      approved_by = case when p_approve then p_actor else approved_by end,
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

---- recreate simulate_card_purchase (alias fix) ----
create or replace function public.simulate_card_purchase(
  p_card_id uuid,
  p_amount numeric(20,2),
  p_currency char(3),
  p_merchant_name text default 'Sandbox Merchant',
  p_merchant_category text default 'Retail',
  p_mcc text default '5999',
  p_country char(2) default 'AE'
)
returns public.card_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_card public.cards%rowtype;
  v_tx public.card_transactions;
  v_fee_income uuid;
begin
  select * into v_card from public.cards where id = p_card_id;
  if v_card is null then
    raise exception 'Card not found';
  end if;
  if v_card.frozen or v_card.status <> 'active' then
    insert into public.card_transactions (
      tenant_id, card_id, amount, currency, merchant_name, merchant_category, mcc, country, status, declined_reason
    ) values (v_tenant, p_card_id, p_amount, p_currency, p_merchant_name, p_merchant_category, p_mcc, p_country, 'declined', 'Card is not active')
    returning * into v_tx;
    return v_tx;
  end if;
  if v_card.daily_limit is not null and p_amount > v_card.daily_limit then
    insert into public.card_transactions (
      tenant_id, card_id, amount, currency, merchant_name, merchant_category, mcc, country, status, declined_reason
    ) values (v_tenant, p_card_id, p_amount, p_currency, p_merchant_name, p_merchant_category, p_mcc, p_country, 'declined', 'Daily limit exceeded')
    returning * into v_tx;
    return v_tx;
  end if;

  -- post to ledger: debit customer account (linked to card), credit fee income & interchange
  select id into v_fee_income from public.coa_accounts where tenant_id = v_tenant and code = '4300';

  perform public.post_journal(
    'Card purchase — ' || p_merchant_name,
    jsonb_build_array(
      jsonb_build_object('account_kind', 'customer', 'account_id', v_card.account_id, 'currency', p_currency, 'debit', p_amount, 'credit', 0, 'memo', p_merchant_name),
      jsonb_build_object('account_kind', 'coa', 'account_id', v_fee_income, 'currency', p_currency, 'debit', 0, 'credit', p_amount, 'memo', 'Interchange income')
    ),
    'card_transaction', p_card_id::text,
    now(), null, auth.uid()
  );

  insert into public.card_transactions (
    tenant_id, card_id, tx_type, amount, currency, merchant_name, merchant_category, mcc, country, status
  ) values (
    v_tenant, p_card_id, 'card_purchase', p_amount, p_currency, p_merchant_name, p_merchant_category, p_mcc, p_country, 'settled'
  )
  returning * into v_tx;

  return v_tx;
end;
$$;

---- international-standard IBANs ----
-- ============================================================
-- Capitech Bank — 0011: International-standard IBAN generation
-- ISO 13616 / ECBS compliant BBAN per country + backfill
-- ============================================================

-- ------------------------------------------------------------
-- generate_iban(country, account_no): standards-compliant IBAN
-- ------------------------------------------------------------
create or replace function public.generate_iban(p_country char(2), p_account_no text)
returns text
language plpgsql
immutable
as $$
declare
  v_country text := upper(p_country);
  v_bank text;
  v_len int;
  v_bban text;
  v_iban text;
  v_check numeric;
begin
  v_bank := case v_country
    when 'AE' then '999'      when 'DE' then '99999999'  when 'GB' then 'CAPT'
    when 'FR' then '99999'    when 'ES' then '9999'      when 'IT' then '99999'
    when 'NL' then 'CAPT'     when 'SA' then '99'        when 'TR' then '99999'
    when 'PL' then '99999999' when 'CZ' then '9999'      when 'HU' then '99999999'
    when 'RO' then 'CAPT'     when 'BG' then 'CAPT'      when 'BR' then '9999999'
    when 'KZ' then '999'      when 'UA' then '999999'    when 'IL' then '999'
    when 'KW' then 'CAPT'     when 'BH' then 'CAPT'      when 'QA' then 'CAPT'
    when 'JO' then 'CAPT'     when 'MU' then 'CAPT'      when 'SC' then 'CAPT'
    when 'MT' then 'CAPT'     when 'MC' then '99999'     when 'SM' then '99999'
    when 'AD' then '9999'     when 'LI' then '99999'     when 'CH' then '99999'
    when 'AT' then '99999'    when 'PT' then '9999'      when 'GR' then '999'
    when 'SE' then '9999'     when 'NO' then '9999'      when 'FI' then '999999'
    when 'DK' then '9999'     when 'IS' then '9999'      when 'IE' then 'CAPT'
    when 'LU' then '999'      when 'BE' then '999'       when 'HR' then '9999999'
    when 'SI' then '99'       when 'SK' then '9999'      when 'EE' then '99'
    when 'LV' then 'CAPT'     when 'LT' then '99999'
    else '99999'
  end;

  v_len := case v_country
    when 'AE' then 23 when 'DE' then 22 when 'GB' then 22 when 'FR' then 27
    when 'ES' then 24 when 'IT' then 27 when 'NL' then 18 when 'SA' then 24
    when 'TR' then 26 when 'PL' then 28 when 'CZ' then 24 when 'HU' then 28
    when 'RO' then 24 when 'BG' then 22 when 'BR' then 29 when 'KZ' then 20
    when 'UA' then 29 when 'IL' then 23 when 'KW' then 30 when 'BH' then 22
    when 'QA' then 29 when 'JO' then 30 when 'MU' then 30 when 'SC' then 31
    when 'MT' then 31 when 'MC' then 27 when 'SM' then 27 when 'AD' then 24
    when 'LI' then 21 when 'CH' then 21 when 'AT' then 20 when 'PT' then 25
    when 'GR' then 27 when 'SE' then 24 when 'NO' then 15 when 'FI' then 18
    when 'DK' then 18 when 'IS' then 26 when 'IE' then 22 when 'LU' then 20
    when 'BE' then 16 when 'HR' then 21 when 'SI' then 19 when 'SK' then 24
    when 'EE' then 20 when 'LV' then 21 when 'LT' then 20
    else 22
  end;

  -- BBAN = national bank identifier + zero-padded account number
  v_bban := lpad(regexp_replace(p_account_no, '\D', '', 'g'), v_len - 4 - length(v_bank), '0');
  v_bban := v_bank || v_bban;

  -- mod-97 check digits (ISO 13616)
  v_iban := v_country || '00' || v_bban;
  v_check := 98 - public.iban_mod97(v_iban);

  return v_country || lpad(v_check::text, 2, '0') || v_bban;
end;
$$;

-- ------------------------------------------------------------
-- Replace the sandbox trigger with the standards-compliant one
-- ------------------------------------------------------------
create or replace function public.fill_iban()
returns trigger
language plpgsql
as $$
declare
  v_country char(2);
begin
  select country into v_country from public.tenants where id = new.tenant_id;
  new.iban := public.generate_iban(v_country, new.account_no);
  new.swift_bic := 'CAPT' || v_country || 'XX';
  return new;
end;
$$;

drop trigger if exists fill_iban_trigger on public.accounts;
create trigger fill_iban_trigger
  before insert on public.accounts
  for each row when (new.iban is null)
  execute function public.fill_iban();

-- ------------------------------------------------------------
-- Backfill existing accounts with compliant IBANs
-- ------------------------------------------------------------
update public.accounts a
set iban = public.generate_iban(t.country, a.account_no),
    swift_bic = 'CAPT' || t.country || 'XX'
from public.tenants t
where t.id = a.tenant_id
  and a.iban is not null
  and (a.iban like '%CAPT%' or a.iban like '%00CAPT%' or length(a.iban) < 15);

grant execute on function public.generate_iban(char, text) to authenticated;

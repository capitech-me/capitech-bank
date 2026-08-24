-- ============================================================
-- Capitech Bank — 20260823000002: FX conversion, external
-- transfers and standing orders
-- ============================================================
-- Scope:
--   C1  payment_orders.fx_rate column.
--   C1  convert_currency() SECURITY DEFINER — the single write path
--       for FX conversions. Posts an audit payment order
--       (tx_type 'fx_conversion', status 'posted', fx_rate stored)
--       plus two balanced per-currency journals through the nostro.
--   C2  execute_payment() extended with external_transfer (debit
--       source, credit nostro '1100', fee to income '4000') and
--       standing_order (same mechanics as internal_transfer).
--   C3  standing_orders table + RLS + owner policies.
--   C3  Idempotent COA seeding for FX & Conversion Income ('4200').
--
-- Idempotent: create-or-replace / drop-if-exists / add-column-if-not-exists.
-- All SECURITY DEFINER functions set search_path = public.
--
-- NOTE (C3 auto-execution): a future pg_cron job (out of scope) is
-- expected to call create_payment('internal_transfer', ...) for every
-- standing_orders row whose next_run_at <= now(), then advance
-- next_run_at per frequency. The table + UI + manual "Run now" are
-- included here; the cron scheduling itself is intentionally a stub.
-- ============================================================

-- ------------------------------------------------------------
-- C1 — payment_orders.fx_rate: the rate applied to a conversion
-- ------------------------------------------------------------
alter table public.payment_orders
  add column if not exists fx_rate numeric(24,12);

-- ------------------------------------------------------------
-- C1/C2 — extend the payment_orders.tx_type enum (the inline check
-- is unnamed in 0006, so it is recreated with the new types)
-- ------------------------------------------------------------
alter table public.payment_orders
  drop constraint if exists payment_orders_tx_type_check;

alter table public.payment_orders
  add constraint payment_orders_tx_type_check
  check (tx_type in (
    'internal_transfer', 'own_transfer', 'deposit', 'withdrawal',
    'card_purchase', 'card_refund', 'fee', 'interest',
    'currency_conversion', 'crypto_buy', 'crypto_sell',
    'deposit_placement', 'deposit_maturity',
    'fx_conversion', 'external_transfer', 'standing_order'
  ));

-- ------------------------------------------------------------
-- C1 — COA seeding: FX & Conversion Income ('4200') if missing
-- (seeded by 0004 for every tenant; this guards partial DBs)
-- ------------------------------------------------------------
insert into public.coa_accounts (tenant_id, code, name, category, normal_side, is_system)
select t.id, '4200', 'FX & Conversion Income', 'income', 'credit', true
from public.tenants t
on conflict (tenant_id, code) do nothing;

-- ------------------------------------------------------------
-- C1 — convert_currency(p_from_account_id, p_to_account_id, p_amount,
--                       p_rate, p_fee_rate, p_reference)
-- Validates ownership + account state, computes fee (source currency)
-- and converted amount (destination currency), then posts:
--   1) source currency journal: debit source (amount + fee),
--      credit nostro '1100' (amount), credit FX income '4200' (fee)
--   2) destination currency journal: debit nostro '1100' (converted),
--      credit destination (converted)
-- Each journal balances within a single currency; the bank's nostro
-- absorbs the FX leg. Returns the audit payment order.
-- ------------------------------------------------------------
create or replace function public.convert_currency(
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric(20,2),
  p_rate numeric(24,12),
  p_fee_rate numeric(8,6) default 0.005,
  p_reference text default null
)
returns public.payment_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_caller uuid := auth.uid();
  v_from public.accounts%rowtype;
  v_to public.accounts%rowtype;
  v_fee numeric(20,2);
  v_converted numeric(20,2);
  v_nostro uuid;
  v_fx_income uuid;
  v_order public.payment_orders;
begin
  if v_tenant is null or v_caller is null then
    raise exception 'Not authenticated';
  end if;
  if p_amount <= 0 or p_rate <= 0 then
    raise exception 'Amount and rate must be positive';
  end if;
  if p_fee_rate < 0 or p_fee_rate > 0.1 then
    raise exception 'Fee rate out of range (max 10%%)';
  end if;

  select * into v_from from public.accounts
  where id = p_from_account_id and tenant_id = v_tenant;
  if v_from is null then
    raise exception 'Source account not found';
  end if;
  if v_from.status <> 'active' or v_from.frozen then
    raise exception 'Source account is not available for transactions';
  end if;

  select * into v_to from public.accounts
  where id = p_to_account_id and tenant_id = v_tenant;
  if v_to is null then
    raise exception 'Destination account not found';
  end if;
  if v_to.status <> 'active' or v_to.frozen then
    raise exception 'Destination account is not available for transactions';
  end if;

  -- Authorization keys on auth.uid() (same rule as post_journal).
  if not public.is_privileged_caller() then
    if public.is_account_owner(p_from_account_id) is not true then
      raise exception 'Source account is not owned by the caller';
    end if;
    if public.is_account_owner(p_to_account_id) is not true then
      raise exception 'Destination account is not owned by the caller';
    end if;
  end if;

  if v_from.currency = v_to.currency then
    raise exception 'Currencies must differ for a conversion';
  end if;

  v_fee := round(p_amount * p_fee_rate, 2);
  v_converted := round(p_amount * p_rate, 2);

  if p_amount + v_fee > v_from.available_balance + 0.0001 then
    raise exception 'Insufficient funds on source account (available % < debit %)',
      v_from.available_balance, p_amount + v_fee;
  end if;

  select c.id into v_nostro from public.coa_accounts c
  where c.tenant_id = v_tenant and c.code = '1100';
  if v_nostro is null then
    raise exception 'Nostro settlement account not configured';
  end if;

  select c.id into v_fx_income from public.coa_accounts c
  where c.tenant_id = v_tenant and c.code = '4200';
  if v_fx_income is null then
    select c.id into v_fx_income from public.coa_accounts c
    where c.tenant_id = v_tenant and c.name ilike '%FX%Income%'
    order by c.code limit 1;
  end if;
  if v_fx_income is null then
    raise exception 'FX income account not configured';
  end if;

  -- Audit trail: record the conversion as a posted payment order.
  insert into public.payment_orders (
    tenant_id, order_no, tx_type, status, amount, currency,
    from_account_id, to_account_id, to_iban, to_bic, to_beneficiary_name,
    fee_amount, fee_currency, fx_rate, reference, narration, created_by,
    approved_by, approved_at, executed_at
  )
  values (
    v_tenant, public.next_order_no(), 'fx_conversion', 'posted', p_amount, v_from.currency,
    v_from.id, v_to.id, v_to.iban, v_to.swift_bic,
    coalesce(nullif(v_to.nickname, ''), v_to.account_no),
    v_fee, v_from.currency, p_rate, p_reference,
    'Converted ' || v_from.currency || ' to ' || v_to.currency || ' @ ' || p_rate,
    v_caller, v_caller, now(), now()
  )
  returning * into v_order;

  -- Journal 1 — source currency: customer out, nostro + FX income in.
  perform public.post_journal(
    'FX conversion ' || v_order.order_no || ' — ' || coalesce(p_reference, 'currency conversion'),
    jsonb_build_array(
      jsonb_build_object('account_kind', 'customer', 'account_id', v_from.id,
                         'currency', v_from.currency, 'debit', p_amount + v_fee,
                         'credit', 0, 'memo', 'FX conversion out'),
      jsonb_build_object('account_kind', 'coa', 'account_id', v_nostro,
                         'currency', v_from.currency, 'debit', 0,
                         'credit', p_amount, 'memo', 'FX funding'),
      jsonb_build_object('account_kind', 'coa', 'account_id', v_fx_income,
                         'currency', v_from.currency, 'debit', 0,
                         'credit', v_fee, 'memo', 'FX fee')
    ),
    'payment_order', v_order.order_no::text,
    now(), null, v_caller
  );

  -- Journal 2 — destination currency: nostro out, customer in.
  perform public.post_journal(
    'FX conversion ' || v_order.order_no || ' — credit to ' || v_to.currency,
    jsonb_build_array(
      jsonb_build_object('account_kind', 'coa', 'account_id', v_nostro,
                         'currency', v_to.currency, 'debit', v_converted,
                         'credit', 0, 'memo', 'FX settlement'),
      jsonb_build_object('account_kind', 'customer', 'account_id', v_to.id,
                         'currency', v_to.currency, 'debit', 0,
                         'credit', v_converted, 'memo', 'FX conversion in')
    ),
    'payment_order', v_order.order_no::text,
    now(), null, v_caller
  );

  return v_order;
end;
$$;

grant execute on function public.convert_currency(uuid, uuid, numeric, numeric, numeric, text) to authenticated;

-- ============================================================
-- C2 — execute_payment extended for external_transfer and
-- standing_order.
--
-- The four original branches (internal_transfer / own_transfer,
-- deposit, withdrawal) are preserved EXACTLY from apply-hotfix5.sql.
-- Two branches are added:
--   external_transfer : debit source (amount + fee), credit nostro
--                       '1100' (amount), credit fee income '4000' (fee)
--   standing_order    : identical mechanics to internal_transfer
-- ============================================================
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
  elsif v_order.tx_type in ('internal_transfer', 'own_transfer', 'external_transfer', 'standing_order') then
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

  if v_order.tx_type in ('internal_transfer', 'own_transfer', 'standing_order') then
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

  elsif v_order.tx_type = 'external_transfer' then
    -- SWIFT/SEPA simulation: debit source (amount + fee), credit the
    -- nostro (amount leaves the bank) and fee income (fee).
    select * into v_from from public.accounts where id = v_order.from_account_id;
    if v_from is null then
      raise exception 'Source account not found';
    end if;

    -- fee: 1.5% of amount, min 15.00, capped at 50.00 (source currency)
    v_fee_amount := least(greatest(v_order.amount * 0.015, 15.00), 50.00);
    select id into v_fee_lines from public.coa_accounts where tenant_id = v_tenant and code = '4000';

    v_lines := jsonb_build_array(
      jsonb_build_object('account_kind', 'customer', 'account_id', v_order.from_account_id, 'currency', v_order.currency, 'debit', v_order.amount + v_fee_amount, 'credit', 0, 'memo', coalesce(v_order.narration, 'External transfer')),
      jsonb_build_object('account_kind', 'coa', 'account_id', v_nostro, 'currency', v_order.currency, 'debit', 0, 'credit', v_order.amount, 'memo', 'External transfer — ' || coalesce(v_order.to_beneficiary_name, v_order.to_iban)),
      jsonb_build_object('account_kind', 'coa', 'account_id', v_fee_lines, 'currency', v_order.currency, 'debit', 0, 'credit', v_fee_amount, 'memo', 'External transfer fee')
    );

    perform public.post_journal(
      'External transfer ' || v_order.order_no || ' — ' || coalesce(v_order.reference, v_order.to_beneficiary_name),
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
      fee_amount = case when v_order.tx_type in ('internal_transfer', 'own_transfer', 'external_transfer', 'standing_order') then v_fee_amount else fee_amount end,
      fee_currency = case when v_order.tx_type in ('internal_transfer', 'own_transfer', 'external_transfer', 'standing_order') then v_order.currency else fee_currency end,
      updated_at = now()
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

grant execute on function public.execute_payment(uuid, uuid, boolean) to authenticated;

-- ============================================================
-- C3 — standing_orders: recurring payment instructions
-- ============================================================
create table if not exists public.standing_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  from_account_id uuid not null references public.accounts(id) on delete restrict,
  to_iban text not null,
  to_bic text,
  to_beneficiary_name text,
  amount numeric(20,2) not null check (amount > 0),
  currency char(3) not null,
  frequency text not null check (frequency in ('weekly', 'monthly', 'quarterly')),
  day_of_month integer check (day_of_month between 1 and 31),
  day_of_week integer check (day_of_week between 1 and 7),
  narration text,
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  next_run_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- weekly orders are scheduled by weekday; monthly/quarterly by day-of-month
  check (
    (frequency = 'weekly' and day_of_week is not null and day_of_month is null)
    or (frequency in ('monthly', 'quarterly') and day_of_month is not null)
  )
);

create index if not exists standing_orders_tenant_idx on public.standing_orders (tenant_id);
create index if not exists standing_orders_from_idx on public.standing_orders (from_account_id);
create index if not exists standing_orders_next_run_idx on public.standing_orders (next_run_at) where status = 'active';

drop trigger if exists standing_orders_touch on public.standing_orders;
create trigger standing_orders_touch before update on public.standing_orders
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- RLS: owner (via is_account_owner) manages their own orders;
-- staff can see and manage all.
-- ------------------------------------------------------------
alter table public.standing_orders enable row level security;

drop policy if exists "standing_orders_select_owner" on public.standing_orders;
create policy "standing_orders_select_owner" on public.standing_orders
  for select to authenticated
  using (public.is_account_owner(from_account_id));

drop policy if exists "standing_orders_select_staff" on public.standing_orders;
create policy "standing_orders_select_staff" on public.standing_orders
  for select to authenticated
  using (public.is_staff());

drop policy if exists "standing_orders_insert_owner" on public.standing_orders;
create policy "standing_orders_insert_owner" on public.standing_orders
  for insert to authenticated
  with check (public.is_account_owner(from_account_id));

drop policy if exists "standing_orders_insert_staff" on public.standing_orders;
create policy "standing_orders_insert_staff" on public.standing_orders
  for insert to authenticated
  with check (public.is_staff());

drop policy if exists "standing_orders_update_owner" on public.standing_orders;
create policy "standing_orders_update_owner" on public.standing_orders
  for update to authenticated
  using (public.is_account_owner(from_account_id))
  with check (public.is_account_owner(from_account_id));

drop policy if exists "standing_orders_update_staff" on public.standing_orders;
create policy "standing_orders_update_staff" on public.standing_orders
  for update to authenticated
  using (public.is_staff());

drop policy if exists "standing_orders_delete_owner" on public.standing_orders;
create policy "standing_orders_delete_owner" on public.standing_orders
  for delete to authenticated
  using (public.is_account_owner(from_account_id));

drop policy if exists "standing_orders_delete_staff" on public.standing_orders;
create policy "standing_orders_delete_staff" on public.standing_orders
  for delete to authenticated
  using (public.is_staff());

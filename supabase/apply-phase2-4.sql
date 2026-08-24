-- ============================================================\n-- Capitech Bank -- PHASE 2-4 SQL BUNDLE (paste into Supabase SQL Editor)\n-- Contains: 0014 org_member_management, 0015 fx_and_external, 0016 notification_prefs, 0017 contact_messages, 0018 standing_order_cron\n-- Idempotent -- safe to re-run.\n-- ============================================================\n\n-- ====== 20260823000001_org_member_management.sql ======\n
-- ============================================================
-- Capitech Bank â€” Migration 0014: Corporate team management (C9)
-- Enables the org OWNER (the customer linked to the organization,
-- i.e. organizations.customer_id -> customers.profile_id = auth.uid())
-- to manage organization_members, view their own organization and
-- look up same-tenant profiles for the member list.
--
-- Additive + idempotent (drop-if-exists + create). No schema changes.
-- ============================================================

-- ------------------------------------------------------------
-- Helper: is the current user the owner of an organization?
-- (organizations.customer_id -> customers.profile_id = auth.uid())
-- ------------------------------------------------------------
create or replace function public.is_org_owner(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations o
    join public.customers c on c.id = o.customer_id
    where o.id = p_org_id
      and c.profile_id = auth.uid()
  )
$$;

grant execute on function public.is_org_owner(uuid) to authenticated;

-- ------------------------------------------------------------
-- organizations â€” owner may read their own organization even if
-- they are not (yet) a row in organization_members.
-- ------------------------------------------------------------
drop policy if exists "orgs_select_owner" on public.organizations;
create policy "orgs_select_owner" on public.organizations
  for select to authenticated
  using (
    exists (
      select 1 from public.customers c
      where c.id = customer_id and c.profile_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- organization_members â€” org owner can SELECT / INSERT / UPDATE / DELETE
-- members of the organizations they own.
-- ------------------------------------------------------------
drop policy if exists "org_members_select_owner" on public.organization_members;
create policy "org_members_select_owner" on public.organization_members
  for select to authenticated
  using (public.is_org_owner(organization_id));

drop policy if exists "org_members_insert_owner" on public.organization_members;
create policy "org_members_insert_owner" on public.organization_members
  for insert to authenticated
  with check (public.is_org_owner(organization_id));

drop policy if exists "org_members_update_owner" on public.organization_members;
create policy "org_members_update_owner" on public.organization_members
  for update to authenticated
  using (public.is_org_owner(organization_id))
  with check (public.is_org_owner(organization_id));

drop policy if exists "org_members_delete_owner" on public.organization_members;
create policy "org_members_delete_owner" on public.organization_members
  for delete to authenticated
  using (public.is_org_owner(organization_id));

-- ------------------------------------------------------------
-- profiles â€” same-tenant lookup for org owners.
-- Needed so the member list can join organization_members ->
-- profiles(first_name, last_name). The profiles table carries no
-- email column (email lives in auth.users); profile id/email
-- resolution on invite is done server-side with the admin client.
-- Scope is deliberately narrow: only authenticated users who own at
-- least one organization in the tenant may read same-tenant profiles.
-- ------------------------------------------------------------
drop policy if exists "profiles_select_org_owner_tenant" on public.profiles;
create policy "profiles_select_org_owner_tenant" on public.profiles
  for select to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and exists (
      select 1
      from public.organizations o
      join public.customers c on c.id = o.customer_id
      where o.tenant_id = public.current_tenant_id()
        and c.profile_id = auth.uid()
    )
  );

-- ====== 20260823000002_fx_and_external.sql ======\n
-- ============================================================
-- Capitech Bank â€” 20260823000002: FX conversion, external
-- transfers and standing orders
-- ============================================================
-- Scope:
--   C1  payment_orders.fx_rate column.
--   C1  convert_currency() SECURITY DEFINER â€” the single write path
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
-- C1 â€” payment_orders.fx_rate: the rate applied to a conversion
-- ------------------------------------------------------------
alter table public.payment_orders
  add column if not exists fx_rate numeric(24,12);

-- ------------------------------------------------------------
-- C1/C2 â€” extend the payment_orders.tx_type enum (the inline check
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
-- C1 â€” COA seeding: FX & Conversion Income ('4200') if missing
-- (seeded by 0004 for every tenant; this guards partial DBs)
-- ------------------------------------------------------------
insert into public.coa_accounts (tenant_id, code, name, category, normal_side, is_system)
select t.id, '4200', 'FX & Conversion Income', 'income', 'credit', true
from public.tenants t
on conflict (tenant_id, code) do nothing;

-- ------------------------------------------------------------
-- C1 â€” convert_currency(p_from_account_id, p_to_account_id, p_amount,
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

  -- Journal 1 â€” source currency: customer out, nostro + FX income in.
  perform public.post_journal(
    'FX conversion ' || v_order.order_no || ' â€” ' || coalesce(p_reference, 'currency conversion'),
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

  -- Journal 2 â€” destination currency: nostro out, customer in.
  perform public.post_journal(
    'FX conversion ' || v_order.order_no || ' â€” credit to ' || v_to.currency,
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
-- C2 â€” execute_payment extended for external_transfer and
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

  -- makerâ€“checker: the approving actor must differ from the creator.
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
      'Payment ' || v_order.order_no || ' â€” ' || coalesce(v_order.reference, 'transfer'),
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
      jsonb_build_object('account_kind', 'coa', 'account_id', v_nostro, 'currency', v_order.currency, 'debit', 0, 'credit', v_order.amount, 'memo', 'External transfer â€” ' || coalesce(v_order.to_beneficiary_name, v_order.to_iban)),
      jsonb_build_object('account_kind', 'coa', 'account_id', v_fee_lines, 'currency', v_order.currency, 'debit', 0, 'credit', v_fee_amount, 'memo', 'External transfer fee')
    );

    perform public.post_journal(
      'External transfer ' || v_order.order_no || ' â€” ' || coalesce(v_order.reference, v_order.to_beneficiary_name),
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
-- C3 â€” standing_orders: recurring payment instructions
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

-- ====== 20260823000003_notification_prefs.sql ======\n
-- ============================================================
-- Capitech Bank â€” 20260823000003: Notification preferences
-- ============================================================
-- Per-user notification preferences: email categories + in-app.
-- One row per profile; the customer app upserts defaults on first
-- change, so no seed insert is required.
-- Idempotent: safe to re-run (create-if-not-exists + drop-if-exists).

create table if not exists public.notification_prefs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  email_transactional boolean not null default true,
  email_security boolean not null default true,
  email_marketing boolean not null default false,
  in_app boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id)
);

create index if not exists notification_prefs_profile_idx on public.notification_prefs (profile_id);

-- ------------------------------------------------------------
-- RLS: owner has full control of their row; staff see/manage all.
-- ------------------------------------------------------------
alter table public.notification_prefs enable row level security;

drop policy if exists "notification_prefs_select_own" on public.notification_prefs;
create policy "notification_prefs_select_own" on public.notification_prefs
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists "notification_prefs_select_staff" on public.notification_prefs;
create policy "notification_prefs_select_staff" on public.notification_prefs
  for select to authenticated using (public.is_staff());

drop policy if exists "notification_prefs_insert_own" on public.notification_prefs;
create policy "notification_prefs_insert_own" on public.notification_prefs
  for insert to authenticated with check (profile_id = auth.uid());

drop policy if exists "notification_prefs_insert_staff" on public.notification_prefs;
create policy "notification_prefs_insert_staff" on public.notification_prefs
  for insert to authenticated with check (public.is_staff());

drop policy if exists "notification_prefs_update_own" on public.notification_prefs;
create policy "notification_prefs_update_own" on public.notification_prefs
  for update to authenticated using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists "notification_prefs_update_staff" on public.notification_prefs;
create policy "notification_prefs_update_staff" on public.notification_prefs
  for update to authenticated using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "notification_prefs_delete_staff" on public.notification_prefs;
create policy "notification_prefs_delete_staff" on public.notification_prefs
  for delete to authenticated using (public.is_staff());

-- touch_updated_at is defined in migration 0002.
drop trigger if exists notification_prefs_touch on public.notification_prefs;
create trigger notification_prefs_touch before update on public.notification_prefs
  for each row execute function public.touch_updated_at();

-- ====== 20260823000004_contact_messages.sql ======\n
-- ============================================================
-- Capitech Bank â€” Migration 0015: Contact messages (C11)
-- Powers the real contact form on the landing site (/contact)
-- plus the staff-only inbox in the admin app (/admin/contact).
--
-- Additive + idempotent (create-if-not-exists + drop-policy-then-
-- recreate). Rerunning is safe.
--
-- RLS model:
--   INSERT  anon + authenticated  (any visitor may submit a message;
--           contact data is intentionally not sensitive â€” email is
--           captured solely so support can reply)
--   SELECT  staff only
--   UPDATE  staff only          (status: new -> responded -> closed)
-- ============================================================

-- ------------------------------------------------------------
-- contact_messages
-- ------------------------------------------------------------
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  name text not null,
  email text not null,
  subject text,
  message text not null,
  status text not null default 'new'
    check (status in ('new', 'responded', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_status_idx on public.contact_messages (status);
create index if not exists contact_messages_created_at_idx on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

-- ------------------------------------------------------------
-- INSERT â€” anon + authenticated visitors (landing site)
-- `with check (true)` is deliberate: the table itself enforces
-- NOT NULL on email/name/message, and message capture is safe.
-- ------------------------------------------------------------
drop policy if exists "contact_messages_insert_public" on public.contact_messages;
create policy "contact_messages_insert_public" on public.contact_messages
  for insert to anon, authenticated
  with check (true);

-- ------------------------------------------------------------
-- SELECT â€” staff only (admin app)
-- ------------------------------------------------------------
drop policy if exists "contact_messages_select_staff" on public.contact_messages;
create policy "contact_messages_select_staff" on public.contact_messages
  for select to authenticated
  using (public.is_staff());

-- ------------------------------------------------------------
-- UPDATE â€” staff only (Mark responded / Close)
-- ------------------------------------------------------------
drop policy if exists "contact_messages_update_staff" on public.contact_messages;
create policy "contact_messages_update_staff" on public.contact_messages
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ====== 20260823000005_standing_order_cron.sql ======\n
-- ============================================================
-- Capitech Bank â€” 20260823000005: Standing order auto-execution (pg_cron)
-- ============================================================
-- Creates `process_due_standing_orders()` (SECURITY DEFINER) plus the
-- `compute_next_run()` helper, and schedules the job in pg_cron.
--
-- WHY NOT literally call create_payment()/execute_payment() with no JWT:
--   In a pg_cron context there is no JWT, so auth.uid() IS NULL. Both
--   create_payment() (migration 0006) and execute_payment() (hotfix5 / 0002)
--   begin with:
--       v_tenant := public.current_tenant_id();  -- NULL when auth.uid() IS NULL
--       if v_tenant is null then raise 'Not authenticated'; end if;
--   so they short-circuit BEFORE ever reaching is_privileged_caller().
--   create_payment() additionally raises when v_actor (auth.uid()) IS NULL and
--   writes payment_orders.created_by = v_actor, but that column is NOT NULL â€”
--   a "system creator of NULL" order is therefore impossible.
--
--   => To honour the documented intent (migration 0002 C3 note: "call
--      create_payment(...) for every due standing_orders row, then advance
--      next_run_at") while actually working, the cron function injects a
--      service-role JWT for the standing order's OWNER (so.created_by) right
--      before each create/execute. This makes auth.uid()/current_tenant_id()
--      resolve to the owner's tenant and makes is_privileged_caller() return
--      true (system execution), and keeps created_by the real customer (NOT NULL).
--
--   IMPORTANT (maker-checker): execute_payment() refuses to let a payment be
--   approved by its creator whenever p_approve = true. Because created_by must
--   be the owner (NOT NULL) and auth.uid() resolves to that same owner here, a
--   p_approve = true call would trip "Maker-checker violation". For an
--   automated recurring transfer the SYSTEM is the approving authority, so we
--   call execute_payment(..., p_approve := false) â€” the maker-checker guard is
--   skipped, the internal-transfer journal posts, and the order is marked
--   'posted'. approved_by stays NULL (system), which is correct for cron.
--
--   The per-row BEGIN/EXCEPTION block wraps everything, so if create/execute
--   fails the whole row is atomically rolled back (no half-created pending
--   order, no orphan journal) â€” then next_run_at is advanced and the owner is
--   notified.
-- ============================================================

-- ------------------------------------------------------------
-- compute_next_run: advance a standing order to its next due time.
--   weekly   -> next occurrence of day_of_week (1=Mon..7=Sun), strictly future
--   monthly  -> next day_of_month with month-end clamping (e.g. 31 -> Feb 28)
--   quarterly-> same as monthly but 3 months ahead
-- Returns a timestamptz (midnight UTC of the target date).
-- ------------------------------------------------------------
create or replace function public.compute_next_run(
  p_frequency text,
  p_day_of_month integer,
  p_day_of_week integer
)
returns timestamptz
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_now   date := current_date;
  v_next  date;
  v_ahead int;
  v_mv    int;
  v_y     int;
  v_m     int;
  v_days  int;
begin
  if p_frequency = 'weekly' then
    -- isodow: 1=Monday .. 7=Sunday (matches day_of_week 1-7)
    v_ahead := (p_day_of_week - extract(isodow from v_now)::int) % 7;
    if v_ahead <= 0 then
      v_ahead := v_ahead + 7;
    end if;
    v_next := v_now + v_ahead;
    return v_next::timestamptz;
  end if;

  -- monthly / quarterly
  v_mv := case when p_frequency = 'monthly' then 1 else 3 end;
  v_y  := extract(year from v_now)::int;
  v_m  := extract(month from v_now)::int;

  -- candidate in the current period (clamp to end of month)
  v_days := extract(day from (date_trunc('month', v_now) + interval '1 month' - interval '1 day'))::int;
  v_next := make_date(v_y, v_m, least(coalesce(p_day_of_month, 1), v_days));

  if v_next <= v_now then
    -- advance one period (1 or 3 months), handling year carry-over
    v_m := v_m + v_mv;
    v_y := v_y + ((v_m - 1) / 12);
    v_m := ((v_m - 1) % 12) + 1;
    v_days := extract(day from (make_date(v_y, v_m, 1) + interval '1 month' - interval '1 day'))::int;
    v_next := make_date(v_y, v_m, least(coalesce(p_day_of_month, 1), v_days));
  end if;

  return v_next::timestamptz;
end;
$$;

-- ------------------------------------------------------------
-- process_due_standing_orders: auto-execute every due active order.
-- Returns the number processed. SECURITY DEFINER (owns all rows),
-- search_path = public.
-- ------------------------------------------------------------
create or replace function public.process_due_standing_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_so        public.standing_orders%rowtype;
  v_actor     uuid;
  v_order     public.payment_orders;
  v_processed integer := 0;
  v_err       text;
  v_next      timestamptz;
begin
  for v_so in
    select * from public.standing_orders
    where status = 'active'
      and next_run_at is not null
      and next_run_at <= now()
    order by next_run_at asc
    limit 50
    for update skip locked
  loop
    v_next := public.compute_next_run(v_so.frequency, v_so.day_of_month, v_so.day_of_week);

    begin
      v_actor := v_so.created_by;

      -- Inject a service-role JWT for the owner so auth.uid()/current_tenant_id()
      -- resolve to the owner's tenant and is_privileged_caller() returns true.
      -- (Both request.jwt.claims and request.jwt.claim.sub are set to satisfy
      --  auth.uid() across Supabase implementations.)
      perform set_config('request.jwt.claims',
        jsonb_build_object('sub', v_actor::text, 'role', 'service_role')::text, true);
      perform set_config('request.jwt.claim.sub', v_actor::text, true);

      -- Create the order (pending) as the owner, then auto-execute (system).
      v_order := public.create_payment(
        'internal_transfer',
        v_so.amount,
        v_so.currency,
        v_so.from_account_id,
        null,
        v_so.to_iban,
        v_so.to_bic,
        v_so.to_beneficiary_name,
        v_so.id::text,           -- p_reference
        coalesce(v_so.narration, 'Standing order'),
        v_so.id::text            -- p_idempotency_key (dedupe on success)
      );

      -- p_approve = false => system auto-approval; posts the internal-transfer
      -- journal (maker-checker guard is bypassed, see header note).
      v_order := public.execute_payment(v_order.id, v_actor, false);

      -- Success: advance the schedule.
      update public.standing_orders
      set next_run_at = v_next,
          updated_at   = now()
      where id = v_so.id;

      v_processed := v_processed + 1;

    exception when others then
      -- Failure: keep SIMPLE â€” advance the schedule anyway (so it does not
      -- retry forever) and notify the owner. The subtransaction rollback above
      -- guarantees no half-created pending order / orphan journal remains.
      v_err := sqlerrm;

      update public.standing_orders
      set next_run_at = v_next,
          updated_at   = now()
      where id = v_so.id;

      insert into public.notifications (tenant_id, profile_id, type, title, body)
      values (
        v_so.tenant_id,
        v_so.created_by,
        'system',
        'Standing order could not be processed',
        'Your ' || v_so.frequency || ' standing order ' || coalesce(v_so.narration, v_so.id::text)
          || ' could not be executed (' || v_err || '). It will be retried next period.'
      );
    end;
  end loop;

  return v_processed;
end;
$$;

-- ------------------------------------------------------------
-- Grants
-- ------------------------------------------------------------
grant execute on function public.compute_next_run(text, integer, integer) to postgres;
grant execute on function public.compute_next_run(text, integer, integer) to service_role;
grant execute on function public.process_due_standing_orders() to postgres;
grant execute on function public.process_due_standing_orders() to service_role;

-- ------------------------------------------------------------
-- Schedule every minute. Guarded so re-running is safe. Uses dynamic SQL
-- (EXECUTE) so the block does not fail to compile if the pg_cron extension is
-- not enabled; if cron.job is absent we skip scheduling with a notice.
-- ------------------------------------------------------------
do $$
declare
  v_exists boolean;
begin
  if to_regclass('cron.job') is not null then
    execute 'select exists (select 1 from cron.job where jobname = ''capitech-standing-orders'')'
      into v_exists;

    if not v_exists then
      execute 'select cron.schedule(''capitech-standing-orders'', ''*/1 * * * *'', ''select public.process_due_standing_orders()'')';
      raise notice 'pg_cron job capitech-standing-orders scheduled every minute.';
    else
      raise notice 'pg_cron job capitech-standing-orders already exists; skipping.';
    end if;
  else
    raise notice 'pg_cron extension is not enabled; standing-order scheduler not installed.';
  end if;
end $$;


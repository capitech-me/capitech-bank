-- ============================================================
-- Capitech Bank — 0006: Payments, SCA and execution engine
-- ============================================================

-- ------------------------------------------------------------
-- payment_orders: the payment lifecycle (maker → checker → posted)
-- ------------------------------------------------------------
create table public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  order_no text not null unique,
  tx_type text not null
    check (tx_type in (
      'internal_transfer', 'own_transfer', 'deposit', 'withdrawal',
      'card_purchase', 'card_refund', 'fee', 'interest',
      'currency_conversion', 'crypto_buy', 'crypto_sell',
      'deposit_placement', 'deposit_maturity'
    )),
  status text not null default 'pending'
    check (status in ('draft', 'pending', 'authorized', 'posted', 'rejected', 'failed', 'cancelled')),
  amount numeric(20,2) not null check (amount > 0),
  currency char(3) not null,
  from_account_id uuid references public.accounts(id) on delete restrict,
  to_account_id uuid references public.accounts(id) on delete restrict,
  to_iban text,
  to_bic text,
  to_beneficiary_name text,
  fee_amount numeric(20,2),
  fee_currency char(3),
  reference text,
  narration text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  executed_at timestamptz,
  failure_reason text,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, order_no),
  unique (idempotency_key)
);

create index payment_orders_tenant_status_idx on public.payment_orders (tenant_id, status);
create index payment_orders_from_idx on public.payment_orders (from_account_id);
create index payment_orders_created_idx on public.payment_orders (created_at desc);

-- order numbering: PAY-YYYYMMDD-<seq>
create sequence if not exists public.payment_seq;
create or replace function public.next_order_no()
returns text
language sql
stable
as $$
  select 'PAY-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.payment_seq')::text, 6, '0')
$$;

-- ------------------------------------------------------------
-- transaction_tokens: SCA / OTP codes for high-value operations
-- ------------------------------------------------------------
create table public.transaction_tokens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  payment_order_id uuid references public.payment_orders(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  code_hash text not null, -- sha256 of the 6-digit code — never store plaintext
  expires_at timestamptz not null,
  consumed boolean not null default false,
  created_at timestamptz not null default now()
);

create index tx_tokens_order_idx on public.transaction_tokens (payment_order_id);

-- ------------------------------------------------------------
-- create_payment: insert an order with maker-checker defaults
-- ------------------------------------------------------------
create or replace function public.create_payment(
  p_tx_type text,
  p_amount numeric(20,2),
  p_currency char(3),
  p_from_account_id uuid,
  p_to_account_id uuid default null,
  p_to_iban text default null,
  p_to_bic text default null,
  p_to_beneficiary_name text default null,
  p_reference text default null,
  p_narration text default null,
  p_idempotency_key text default null
)
returns public.payment_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_actor uuid := auth.uid();
  v_order public.payment_orders;
  v_account public.accounts%rowtype;
begin
  if v_tenant is null or v_actor is null then
    raise exception 'Not authenticated';
  end if;

  -- Validate source account belongs to caller's tenant
  if p_from_account_id is not null then
    select * into v_account from public.accounts
    where id = p_from_account_id and tenant_id = v_tenant;
    if v_account is null then
      raise exception 'Source account not found';
    end if;
    if v_account.frozen or v_account.status <> 'active' then
      raise exception 'Source account is not available';
    end if;
    if v_account.currency <> p_currency then
      raise exception 'Source account currency mismatch';
    end if;
  end if;

  insert into public.payment_orders (
    tenant_id, order_no, tx_type, status, amount, currency,
    from_account_id, to_account_id, to_iban, to_bic, to_beneficiary_name,
    reference, narration, created_by, idempotency_key
  )
  values (
    v_tenant, public.next_order_no(), p_tx_type, 'pending', p_amount, p_currency,
    p_from_account_id, p_to_account_id, p_to_iban, p_to_bic, p_to_beneficiary_name,
    p_reference, p_narration, v_actor, p_idempotency_key
  )
  returning * into v_order;

  return v_order;
end;
$$;

-- ------------------------------------------------------------
-- execute_payment: the ONLY path that posts a payment to the ledger
-- Validates maker != checker, moves funds, records fees.
-- ------------------------------------------------------------
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
    select c.id into v_fee_lines from public.coa_accounts where tenant_id = v_tenant and code = '4000';
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

grant execute on function public.create_payment(text, numeric, character, uuid, uuid, text, text, text, text, text, text) to authenticated;
grant execute on function public.execute_payment(uuid, uuid, boolean) to authenticated;
grant execute on function public.next_journal_no() to authenticated;

create trigger payment_orders_touch before update on public.payment_orders
  for each row execute function public.touch_updated_at();

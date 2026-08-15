-- ============================================================
-- Capitech Bank — 0008: Term deposits + interest accrual
-- ============================================================

-- ------------------------------------------------------------
-- deposits: fixed-term deposit contracts
-- ------------------------------------------------------------
create table public.deposits (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  account_id uuid not null references public.accounts(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  product_id uuid not null references public.products(id) on delete restrict,
  principal numeric(20,2) not null check (principal > 0),
  currency char(3) not null,
  interest_rate numeric(9,4) not null,
  term_days integer not null check (term_days between 1 and 3650),
  start_date date not null default current_date,
  maturity_date date not null,
  interest_accrued numeric(20,2) not null default 0,
  rollover boolean not null default false,
  status text not null default 'active'
    check (status in ('active', 'matured', 'closed', 'rolled_over')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index deposits_customer_idx on public.deposits (customer_id);
create index deposits_status_idx on public.deposits (status);

-- ------------------------------------------------------------
-- open_deposit: move funds from account into a term deposit
-- ------------------------------------------------------------
create or replace function public.open_deposit(
  p_account_id uuid,
  p_product_id uuid,
  p_principal numeric(20,2),
  p_term_days integer,
  p_rollover boolean default false
)
returns public.deposits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_account public.accounts%rowtype;
  v_product public.products%rowtype;
  v_deposit public.deposits;
  v_deposit_coa uuid;
begin
  if v_tenant is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_account from public.accounts where id = p_account_id and tenant_id = v_tenant;
  if v_account is null then
    raise exception 'Account not found';
  end if;

  select * into v_product from public.products where id = p_product_id and tenant_id = v_tenant;
  if v_product is null or v_product.product_type <> 'term_deposit' then
    raise exception 'Term deposit product not found';
  end if;
  if p_term_days < v_product.min_term_days or p_term_days > v_product.max_term_days then
    raise exception 'Term must be between % and % days', v_product.min_term_days, p_term_days;
  end if;

  -- Move principal from the customer account to the term-deposit liability account
  insert into public.deposits (
    tenant_id, account_id, customer_id, product_id, principal, currency,
    interest_rate, term_days, start_date, maturity_date, rollover, status
  ) values (
    v_tenant, p_account_id, v_account.owner_id, p_product_id, p_principal, v_account.currency,
    v_product.interest_rate, p_term_days, current_date, current_date + p_term_days, p_rollover, 'active'
  )
  returning * into v_deposit;

  select c.id into v_deposit_coa from public.coa_accounts c
  where c.tenant_id = v_tenant and c.code = '2200';

  perform public.post_journal(
    'Term deposit placement ' || v_deposit.id,
    jsonb_build_array(
      jsonb_build_object('account_kind', 'customer', 'account_id', p_account_id, 'currency', v_account.currency, 'debit', p_principal, 'credit', 0, 'memo', 'Deposit placement'),
      jsonb_build_object('account_kind', 'coa', 'account_id', v_deposit_coa, 'currency', v_account.currency, 'debit', 0, 'credit', p_principal, 'memo', 'Term deposit liability')
    ),
    'deposit', v_deposit.id::text,
    now(), null, auth.uid()
  );

  return v_deposit;
end;
$$;

-- ------------------------------------------------------------
-- accrue_deposit_interest: daily accrual job (runs via pg_cron)
-- ------------------------------------------------------------
create or replace function public.accrue_deposit_interest()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_dep public.deposits%rowtype;
  v_day_interest numeric(20,6);
  v_interest_coa uuid;
  v_expense_coa uuid;
begin
  select c.id into v_interest_coa from public.coa_accounts c where c.code = '2400' limit 1;
  select c.id into v_expense_coa from public.coa_accounts c where c.code = '5000' limit 1;

  for v_dep in
    select * from public.deposits
    where status = 'active' and maturity_date > current_date
    for update
  loop
    v_day_interest := v_dep.principal * (v_dep.interest_rate / 100.0) / 365.0;

    update public.deposits
    set interest_accrued = interest_accrued + v_day_interest,
        updated_at = now()
    where id = v_dep.id;

    -- accrual journal: Interest Expense (debit) / Interest Payable (credit)
    perform public.post_journal(
      'Daily interest accrual — deposit ' || v_dep.id,
      jsonb_build_array(
        jsonb_build_object('account_kind', 'coa', 'account_id', v_expense_coa, 'currency', v_dep.currency, 'debit', v_day_interest, 'credit', 0, 'memo', 'Interest accrual'),
        jsonb_build_object('account_kind', 'coa', 'account_id', v_interest_coa, 'currency', v_dep.currency, 'debit', 0, 'credit', v_day_interest, 'memo', 'Interest accrual')
      ),
      'deposit_interest', v_dep.id::text,
      now(), v_dep.tenant_id, (select id from public.profiles where role = 'staff_admin' limit 1)
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ------------------------------------------------------------
-- mature_deposits: settle matured deposits (principal + interest)
-- ------------------------------------------------------------
create or replace function public.mature_deposits()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_dep public.deposits%rowtype;
  v_total numeric(20,2);
  v_deposit_coa uuid;
  v_interest_coa uuid;
  v_interest_income uuid;
  v_payout_account uuid;
begin
  select c.id into v_deposit_coa from public.coa_accounts c where c.code = '2200' limit 1;
  select c.id into v_interest_coa from public.coa_accounts c where c.code = '2400' limit 1;
  select c.id into v_interest_income from public.coa_accounts c where c.code = '4100' limit 1;

  for v_dep in
    select * from public.deposits
    where status = 'active' and maturity_date <= current_date
    for update
  loop
    v_total := v_dep.principal + v_dep.interest_accrued;
    v_payout_account := v_dep.account_id;

    perform public.post_journal(
      'Term deposit maturity — ' || v_dep.id,
      jsonb_build_array(
        jsonb_build_object('account_kind', 'coa', 'account_id', v_deposit_coa, 'currency', v_dep.currency, 'debit', v_dep.principal, 'credit', 0, 'memo', 'Principal return'),
        jsonb_build_object('account_kind', 'coa', 'account_id', v_interest_coa, 'currency', v_dep.currency, 'debit', v_dep.interest_accrued, 'credit', 0, 'memo', 'Interest payout'),
        jsonb_build_object('account_kind', 'customer', 'account_id', v_payout_account, 'currency', v_dep.currency, 'debit', 0, 'credit', v_total, 'memo', 'Deposit maturity payout'),
        jsonb_build_object('account_kind', 'coa', 'account_id', v_interest_income, 'currency', v_dep.currency, 'debit', 0, 'credit', v_dep.interest_accrued, 'memo', 'Interest expense reversal')
      ),
      'deposit_maturity', v_dep.id::text,
      now(), v_dep.tenant_id, (select id from public.profiles where role = 'staff_admin' limit 1)
    );

    update public.deposits
    set status = case when v_dep.rollover then 'rolled_over' else 'matured' end,
        updated_at = now()
    where id = v_dep.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.open_deposit(uuid, uuid, numeric, integer, boolean) to authenticated;
grant execute on function public.accrue_deposit_interest() to authenticated;
grant execute on function public.mature_deposits() to authenticated;

create trigger deposits_touch before update on public.deposits
  for each row execute function public.touch_updated_at();

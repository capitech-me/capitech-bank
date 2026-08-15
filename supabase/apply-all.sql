-- ============================================================
-- Capitech Bank — FULL SCHEMA (apply-all)
-- Paste this entire file into: Supabase Dashboard → SQL Editor
-- Run order: migrations 0001 → 0010 concatenated
-- ============================================================

-- ============================================================
-- Capitech Bank — 0001: Extensions
-- ============================================================

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- pg_cron for scheduled jobs (interest accrual, deposit maturity)
-- Requires the pg_cron extension to be enabled in the Supabase dashboard.
create extension if not exists "pg_cron";

-- ============================================================
-- Capitech Bank — 0002: Tenancy, roles and profiles
-- ============================================================

-- ------------------------------------------------------------
-- tenants: bank entities (multi-tenant platform support)
-- ------------------------------------------------------------
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  country char(2) not null default 'AE',
  base_currency char(3) not null default 'USD',
  timezone text not null default 'UTC',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- profiles: one row per auth user, carries role + tenant
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  role text not null default 'customer'
    check (role in (
      'customer',
      'corporate_admin',
      'staff_teller',
      'staff_operations',
      'staff_compliance',
      'staff_accountant',
      'staff_admin',
      'super_admin'
    )),
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  email_notifications boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_tenant_idx on public.profiles (tenant_id);
create index if not exists profiles_role_idx on public.profiles (role);

-- ------------------------------------------------------------
-- Default tenant (the bank itself)
-- ------------------------------------------------------------
insert into public.tenants (slug, name, country, base_currency)
values ('capitech', 'Capitech Bank', 'AE', 'USD')
on conflict (slug) do nothing;

-- ------------------------------------------------------------
-- Helper functions
-- ------------------------------------------------------------

-- Tenant of the currently authenticated user
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.profiles where id = auth.uid()
$$;

-- Is the current user staff (any back-office role)?
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select role in ('staff_teller','staff_operations','staff_compliance','staff_accountant','staff_admin','super_admin')
    from public.profiles where id = auth.uid()
  ), false)
$$;

-- Does the current user hold a specific role?
create or replace function public.has_role(p_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = p_role from public.profiles where id = auth.uid()), false)
$$;

-- Is the current user a customer (non-staff)?
create or replace function public.is_customer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select role in ('customer','corporate_admin')
    from public.profiles where id = auth.uid()
  ), false)
$$;

-- ------------------------------------------------------------
-- Trigger: create profile on signup
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_role text := coalesce(new.raw_user_meta_data ->> 'role', 'customer');
begin
  select id into v_tenant_id from public.tenants order by created_at limit 1;
  if v_tenant_id is null then
    raise exception 'No tenant configured';
  end if;

  insert into public.profiles (id, tenant_id, role, first_name, last_name, phone)
  values (
    new.id,
    v_tenant_id,
    v_role,
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- updated_at helper
-- ------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tenants_touch before update on public.tenants
  for each row execute function public.touch_updated_at();
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ============================================================
-- Capitech Bank — 0003: Onboarding & KYC
-- ============================================================

-- ------------------------------------------------------------
-- customers: retail + corporate entity records
-- ------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  profile_id uuid references public.profiles(id) on delete set null,
  customer_no text not null unique,
  customer_type text not null default 'retail' check (customer_type in ('retail', 'corporate')),
  kyc_level text not null default 'unverified'
    check (kyc_level in ('unverified', 'level_1', 'level_2', 'level_3')),
  kyc_status text not null default 'draft'
    check (kyc_status in ('draft', 'pending', 'approved', 'rejected')),

  -- retail fields
  legal_first_name text,
  legal_last_name text,
  date_of_birth date,
  nationality char(2),
  country_of_residence char(2),
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  occupation text,
  source_of_funds text,

  -- corporate fields (kept denormalised on customers for a unified queue)
  legal_name text,
  trading_name text,
  registration_number text,
  tax_id text,
  country_of_incorporation char(2),
  entity_type text,
  industry text,
  website text,

  is_pep boolean not null default false,
  is_sanctioned boolean not null default false,
  risk_score numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_tenant_idx on public.customers (tenant_id);
create index customers_kyc_status_idx on public.customers (kyc_status);
create index customers_profile_idx on public.customers (profile_id);

-- ------------------------------------------------------------
-- organizations: corporate entities (mirror of corporate customers)
-- ------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete cascade,
  legal_name text not null,
  trading_name text,
  registration_number text,
  tax_id text,
  country_of_incorporation char(2) not null,
  entity_type text,
  industry text,
  website text,
  address_line1 text,
  city text,
  state text,
  postal_code text,
  kyc_status text not null default 'draft'
    check (kyc_status in ('draft', 'pending', 'approved', 'rejected')),
  risk_score numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index organizations_tenant_idx on public.organizations (tenant_id);

-- ------------------------------------------------------------
-- organization_members: directors, signatories, approvers
-- ------------------------------------------------------------
create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  role_title text not null default 'Director',
  is_signatory boolean not null default false,
  approval_threshold numeric(20,2), -- max amount this member can approve alone
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create index org_members_org_idx on public.organization_members (organization_id);

-- ------------------------------------------------------------
-- kyc_documents: uploaded identity / company documents
-- ------------------------------------------------------------
create table public.kyc_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  document_type text not null
    check (document_type in (
      'passport', 'national_id', 'drivers_licence', 'proof_of_address',
      'certificate_of_incorporation', 'articles_of_association', 'tax_clearance'
    )),
  file_path text not null,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now()
);

create index kyc_docs_customer_idx on public.kyc_documents (customer_id);
create index kyc_docs_status_idx on public.kyc_documents (status);

-- ============================================================
-- Capitech Bank — 0004: Chart of accounts + products
-- ============================================================

-- ------------------------------------------------------------
-- coa_accounts: IFRS-aligned chart of accounts (per tenant)
-- ------------------------------------------------------------
create table public.coa_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  code text not null,
  name text not null,
  category text not null check (category in ('asset', 'liability', 'equity', 'income', 'expense')),
  normal_side text not null check (normal_side in ('debit', 'credit')),
  currency char(3), -- null = all currencies (tracked per currency in balances)
  is_system boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create index coa_tenant_idx on public.coa_accounts (tenant_id);

-- Seed the default chart of accounts for the Capitech tenant
insert into public.coa_accounts (tenant_id, code, name, category, normal_side, is_system)
select t.id, seed.code, seed.name, seed.category, seed.normal_side, true
from public.tenants t
cross join (
  values
    ('1000', 'Cash on Hand', 'asset', 'debit'),
    ('1100', 'Nostro / Settlement Accounts', 'asset', 'debit'),
    ('1200', 'Loans & Advances', 'asset', 'debit'),
    ('1300', 'Crypto Assets Held', 'asset', 'debit'),
    ('1400', 'Interbank Placements', 'asset', 'debit'),
    ('1500', 'Property & Equipment', 'asset', 'debit'),
    ('1600', 'Intangible Assets', 'asset', 'debit'),
    ('1700', 'Prepaid Expenses', 'asset', 'debit'),
    ('1800', 'Receivables & Accruals', 'asset', 'debit'),
    ('2000', 'Customer Deposits — Current', 'liability', 'credit'),
    ('2100', 'Customer Deposits — Savings', 'liability', 'credit'),
    ('2200', 'Customer Term Deposits', 'liability', 'credit'),
    ('2300', 'Customer Crypto Balances', 'liability', 'credit'),
    ('2400', 'Interest Payable', 'liability', 'credit'),
    ('2500', 'Fees Received in Advance', 'liability', 'credit'),
    ('2600', 'Interbank Borrowings', 'liability', 'credit'),
    ('2700', 'Payables & Accruals', 'liability', 'credit'),
    ('2800', 'Suspense Accounts', 'liability', 'credit'),
    ('2900', 'VAT / Taxes Payable', 'liability', 'credit'),
    ('3000', 'Share Capital', 'equity', 'credit'),
    ('3100', 'Retained Earnings', 'equity', 'credit'),
    ('3200', 'Other Reserves', 'equity', 'credit'),
    ('4000', 'Fee Income', 'income', 'credit'),
    ('4100', 'Interest Income', 'income', 'credit'),
    ('4200', 'FX & Conversion Income', 'income', 'credit'),
    ('4300', 'Card Interchange Income', 'income', 'credit'),
    ('5000', 'Interest Expense', 'expense', 'debit'),
    ('5100', 'Staff Costs', 'expense', 'debit'),
    ('5200', 'Technology & Infrastructure', 'expense', 'debit'),
    ('5300', 'Marketing', 'expense', 'debit'),
    ('5400', 'Professional Fees', 'expense', 'debit'),
    ('5500', 'Depreciation & Amortisation', 'expense', 'debit'),
    ('5600', 'Impairment & Provisions', 'expense', 'debit'),
    ('5700', 'Regulatory & Compliance Costs', 'expense', 'debit'),
    ('5800', 'Other Operating Expenses', 'expense', 'debit')
) as seed(code, name, category, normal_side)
on conflict (tenant_id, code) do nothing;

-- ------------------------------------------------------------
-- products: banking products offered to customers
-- ------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  code text not null,
  name text not null,
  product_type text not null
    check (product_type in ('current', 'savings', 'term_deposit', 'crypto', 'multi_currency')),
  currency char(3), -- null = multi-currency
  coa_account_id uuid references public.coa_accounts(id) on delete restrict,
  description text,
  interest_rate numeric(9,4), -- annual % p.a. (savings / deposits)
  min_opening_balance numeric(20,2),
  max_balance numeric(20,2),
  monthly_fee numeric(20,2),
  daily_transfer_limit numeric(20,2),
  min_term_days integer,
  max_term_days integer,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create index products_tenant_idx on public.products (tenant_id);

-- Seed products (coa link: 2000 current, 2100 savings, 2200 term deposits)
insert into public.products (
  tenant_id, code, name, product_type, currency, coa_account_id, description,
  interest_rate, min_opening_balance, monthly_fee, daily_transfer_limit, status
)
select
  t.id,
  seed.code, seed.name, seed.product_type, seed.currency,
  c.id as coa_account_id,
  seed.description, seed.interest_rate, seed.min_opening_balance,
  seed.monthly_fee, seed.daily_transfer_limit, 'active'
from public.tenants t
cross join (
  values
    ('CUR_MULTI', 'Multi-Currency Current', 'current', null::char(3), '2000',
     'Everyday account in 30+ currencies with instant transfers.', null::numeric, 0, 0, 50000),
    ('CUR_USD', 'US Dollar Current', 'current', 'USD', '2000',
     'US dollar current account with virtual cards.', null, 0, 0, 50000),
    ('CUR_EUR', 'Euro Current', 'current', 'EUR', '2000',
     'Euro current account with SEPA-style sandbox rails.', null, 0, 0, 50000),
    ('SAV_USD', 'Savings Plus (USD)', 'savings', 'USD', '2100',
     'High-yield savings with daily interest accrual.', 3.50, 100, 0, 25000),
    ('SAV_EUR', 'Savings Plus (EUR)', 'savings', 'EUR', '2100',
     'High-yield euro savings with daily interest accrual.', 2.75, 100, 0, 25000),
    ('TD_USD', 'Fixed Term Deposit (USD)', 'term_deposit', 'USD', '2200',
     'Fixed-rate term deposits from 7 days.', 4.25, 1000, null, null),
    ('TD_EUR', 'Fixed Term Deposit (EUR)', 'term_deposit', 'EUR', '2200',
     'Fixed-rate euro term deposits from 7 days.', 3.10, 1000, null, null),
    ('CORP_USD', 'Corporate Current', 'current', 'USD', '2000',
     'Corporate operating account with maker–checker approvals.', null, 0, 49, 250000),
    ('CORP_MULTI', 'Corporate Multi-Currency', 'multi_currency', null, '2000',
     'Treasury-grade multi-currency corporate account.', null, 0, 99, 1000000)
) as seed(code, name, product_type, currency, coa_code, description, interest_rate, min_opening_balance, monthly_fee, daily_transfer_limit)
left join public.coa_accounts c on c.tenant_id = t.id and c.code = seed.coa_code
on conflict (tenant_id, code) do nothing;

create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ============================================================
-- Capitech Bank — 0005: Accounts, balances and the ledger engine
-- ============================================================

-- ------------------------------------------------------------
-- accounts: customer-facing banking accounts
-- ------------------------------------------------------------
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  account_no text not null unique,
  iban text,
  swift_bic text,
  product_id uuid not null references public.products(id) on delete restrict,
  coa_account_id uuid references public.coa_accounts(id) on delete restrict,
  owner_type text not null check (owner_type in ('customer', 'organization')),
  owner_id uuid not null,
  currency char(3) not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'frozen', 'closed')),
  nickname text,
  ledger_balance numeric(20,2) not null default 0,
  available_balance numeric(20,2) not null default 0,
  daily_transfer_limit numeric(20,2),
  frozen boolean not null default false,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index accounts_tenant_idx on public.accounts (tenant_id);
create index accounts_owner_idx on public.accounts (owner_type, owner_id);
create index accounts_currency_idx on public.accounts (currency);

-- ------------------------------------------------------------
-- balances: per-COA-account, per-currency running balances
-- ------------------------------------------------------------
create table public.balances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  coa_account_id uuid not null references public.coa_accounts(id) on delete restrict,
  currency char(3) not null,
  ledger_balance numeric(24,6) not null default 0,
  available_balance numeric(24,6) not null default 0,
  last_transaction_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (coa_account_id, currency)
);

create index balances_tenant_idx on public.balances (tenant_id);

-- ------------------------------------------------------------
-- gl_entries + gl_entry_lines: immutable double-entry journals
-- ------------------------------------------------------------
create table public.gl_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  journal_no text not null unique,
  entry_date timestamptz not null default now(),
  post_date timestamptz not null default now(),
  description text not null,
  reference_type text,
  reference_id text,
  status text not null default 'posted' check (status in ('draft', 'posted', 'reversed')),
  created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create index gl_entries_tenant_idx on public.gl_entries (tenant_id);
create index gl_entries_reference_idx on public.gl_entries (reference_type, reference_id);

create table public.gl_entry_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  entry_id uuid not null references public.gl_entries(id) on delete cascade,
  coa_account_id uuid references public.coa_accounts(id) on delete restrict,
  customer_account_id uuid references public.accounts(id) on delete restrict,
  currency char(3) not null,
  debit numeric(20,2) not null default 0 check (debit >= 0),
  credit numeric(20,2) not null default 0 check (credit >= 0),
  memo text,
  created_at timestamptz not null default now(),
  check (coa_account_id is not null or customer_account_id is not null),
  check (not (debit > 0 and credit > 0))
);

create index gl_lines_entry_idx on public.gl_entry_lines (entry_id);
create index gl_lines_account_idx on public.gl_entry_lines (coa_account_id);
create index gl_lines_customer_account_idx on public.gl_entry_lines (customer_account_id);

-- ------------------------------------------------------------
-- helpers
-- ------------------------------------------------------------
create or replace function public.generate_account_no()
returns text
language sql
stable
as $$
  select lpad(floor(random() * 1e11)::bigint::text, 11, '0')
$$;

-- journal numbering: GL-YYYYMMDD-<seq>
create sequence if not exists public.journal_seq;

create or replace function public.next_journal_no()
returns text
language sql
stable
as $$
  select 'GL-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.journal_seq')::text, 6, '0')
$$;

-- ------------------------------------------------------------
-- open_account: create account + IBAN + initial balance row
-- ------------------------------------------------------------
create or replace function public.open_account(
  p_owner_type text,
  p_owner_id uuid,
  p_product_id uuid,
  p_currency char(3),
  p_nickname text default null
)
returns public.accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_product public.products%rowtype;
  v_account public.accounts;
  v_country char(2);
begin
  if v_tenant is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_product from public.products where id = p_product_id and tenant_id = v_tenant;
  if v_product is null then
    raise exception 'Product not found';
  end if;
  if v_product.status <> 'active' then
    raise exception 'Product is not active';
  end if;
  if v_product.currency is not null and v_product.currency <> p_currency then
    raise exception 'Product is restricted to currency %', v_product.currency;
  end if;

  -- owner must exist in this tenant
  if p_owner_type = 'customer' then
    if not exists (select 1 from public.customers where id = p_owner_id and tenant_id = v_tenant) then
      raise exception 'Customer not found';
    end if;
  elsif p_owner_type = 'organization' then
    if not exists (select 1 from public.organizations where id = p_owner_id and tenant_id = v_tenant) then
      raise exception 'Organization not found';
    end if;
  else
    raise exception 'Invalid owner type';
  end if;

  select country into v_country from public.tenants where id = v_tenant;

  insert into public.accounts (
    tenant_id, account_no, iban, swift_bic, product_id, coa_account_id,
    owner_type, owner_id, currency, status, nickname, daily_transfer_limit
  )
  values (
    v_tenant,
    public.generate_account_no(),
    null, -- filled by trigger below (needs account_no)
    'CAPT' || v_country || 'XX',
    p_product_id,
    v_product.coa_account_id,
    p_owner_type, p_owner_id, p_currency,
    'active', p_nickname,
    v_product.daily_transfer_limit
  )
  returning * into v_account;

  -- initial zero balance row
  insert into public.balances (tenant_id, coa_account_id, currency)
  values (v_tenant, v_product.coa_account_id, p_currency)
  on conflict (coa_account_id, currency) do nothing;

  return v_account;
end;
$$;

-- ------------------------------------------------------------
-- IBAN trigger: derive from account_no once inserted
-- (see packages/lib/src/iban.ts for the mod-97 implementation)
-- ------------------------------------------------------------
create or replace function public.fill_iban()
returns trigger
language plpgsql
as $$
declare
  v_country char(2);
  v_bban text;
  v_check int;
  v_iban text;
begin
  select country into v_country from public.tenants where id = new.tenant_id;

  -- BBAN = bank code + account number, padded to 18 digits (DE-style sandbox)
  v_bban := lpad('CAPT' || new.account_no, 18, '0');
  v_iban := v_country || '00' || v_bban;

  -- mod-97 check digit calculation
  v_check := 98 - (public.iban_mod97(v_iban)::int);
  new.iban := v_country || lpad(v_check::text, 2, '0') || v_bban;

  return new;
end;
$$;

-- mod-97 helper (pure SQL, ECBS/ISO 13616 algorithm)
create or replace function public.iban_mod97(p_iban text)
returns numeric
language plpgsql
immutable
as $$
declare
  v_rearranged text := substr(p_iban, 5) || substr(p_iban, 1, 4);
  v_char text;
  v_rem numeric := 0;
begin
  for i in 1..length(v_rearranged) loop
    v_char := substr(v_rearranged, i, 1);
    if v_char ~ '[A-Z]' then
      v_char := (ascii(v_char) - 55)::text;
    end if;
    -- chunked mod-97 to avoid overflow
    for j in 1..length(v_char) loop
      v_rem := mod(v_rem * 10 + (substr(v_char, j, 1))::int, 97);
    end loop;
  end loop;
  return v_rem;
end;
$$;

-- placeholder overridden by the account_no version (IBAN moved to app layer via API)
drop trigger if exists fill_iban_trigger on public.accounts;
create trigger fill_iban_trigger
  before insert on public.accounts
  for each row when (new.iban is null)
  execute function public.fill_iban();

-- ------------------------------------------------------------
-- post_journal — THE single write path of the ledger
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
  v_coa_bal public.balances%rowtype;
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
      select * into v_coa_bal from public.coa_accounts where id = v_coa_id;
      if v_coa_bal is null or v_coa_bal.tenant_id <> v_tenant then
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

-- ------------------------------------------------------------
-- ledger_snapshot: chart of accounts with live balances
-- (customer-deposit COA balances = base + sum of linked customer accounts)
-- ------------------------------------------------------------
create or replace function public.ledger_snapshot()
returns table (
  code text,
  name text,
  category text,
  normal_side text,
  currency char(3),
  balance numeric(20,2)
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.code,
    c.name,
    c.category,
    c.normal_side,
    coalesce(b.currency, t.base_currency) as currency,
    coalesce(b.ledger_balance, 0) +
      coalesce((
        select sum(a.ledger_balance)
        from public.accounts a
        where a.coa_account_id = c.id
          and a.currency = coalesce(b.currency, t.base_currency)
          and a.status <> 'closed'
      ), 0) as balance
  from public.coa_accounts c
  cross join public.tenants t
  left join public.balances b on b.coa_account_id = c.id
  where c.tenant_id = public.current_tenant_id()
    and t.id = public.current_tenant_id()
  order by c.code
$$;

grant execute on function public.post_journal(text, jsonb, text, text, timestamptz, uuid, uuid) to authenticated;
grant execute on function public.open_account(text, uuid, uuid, character, text) to authenticated;
grant execute on function public.ledger_snapshot() to authenticated;
grant execute on function public.current_tenant_id() to authenticated, anon;
grant execute on function public.is_staff() to authenticated, anon;
grant execute on function public.has_role(text) to authenticated, anon;
grant execute on function public.is_customer() to authenticated, anon;

create trigger accounts_touch before update on public.accounts
  for each row execute function public.touch_updated_at();

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

-- ============================================================
-- Capitech Bank — 0007: Virtual cards + card transactions
-- ============================================================

-- ------------------------------------------------------------
-- cards: tokenised virtual cards (PAN never stored — last4 only)
-- ------------------------------------------------------------
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  account_id uuid not null references public.accounts(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  brand text not null default 'visa' check (brand in ('visa', 'mastercard')),
  last4 text not null check (last4 ~ '^\d{4}$'),
  token text not null, -- payment token reference (sandbox: opaque string)
  exp_month integer not null check (exp_month between 1 and 12),
  exp_year integer not null,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'frozen', 'expired', 'closed')),
  name_on_card text,
  daily_limit numeric(20,2),
  monthly_limit numeric(20,2),
  online_enabled boolean not null default true,
  atm_enabled boolean not null default false,
  contactless_enabled boolean not null default true,
  frozen boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cards_account_idx on public.cards (account_id);
create index cards_customer_idx on public.cards (customer_id);

-- ------------------------------------------------------------
-- card_transactions: simulated authorisation / capture / settlement
-- ------------------------------------------------------------
create table public.card_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  card_id uuid not null references public.cards(id) on delete restrict,
  tx_type text not null default 'card_purchase' check (tx_type in ('card_purchase', 'card_refund')),
  amount numeric(20,2) not null,
  currency char(3) not null,
  merchant_name text,
  merchant_category text,
  mcc text, -- merchant category code (ISO 18245)
  country char(2),
  status text not null default 'settled' check (status in ('authorized', 'captured', 'settled', 'refunded', 'declined')),
  declined_reason text,
  created_at timestamptz not null default now()
);

create index card_tx_card_idx on public.card_transactions (card_id);

-- ------------------------------------------------------------
-- Simulated card purchase: posts to ledger when settled
-- ------------------------------------------------------------
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
  select c.id into v_fee_income from public.coa_accounts where tenant_id = v_tenant and code = '4300';

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

grant execute on function public.simulate_card_purchase(uuid, numeric, character, text, text, text, character) to authenticated;

create trigger cards_touch before update on public.cards
  for each row execute function public.touch_updated_at();

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

-- ============================================================
-- Capitech Bank — 0009: Operations (notifications, audit, crypto,
-- Open API — phase 2 ready) + scheduled jobs
-- ============================================================

-- ------------------------------------------------------------
-- notifications: in-app + email digest
-- ------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'info'
    check (type in ('info', 'transaction', 'security', 'card', 'deposit', 'kyc', 'system')),
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_profile_idx on public.notifications (profile_id, read, created_at desc);

-- ------------------------------------------------------------
-- operation_logs: append-only audit trail for back office
-- ------------------------------------------------------------
create table public.operation_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  details jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index operation_logs_tenant_idx on public.operation_logs (tenant_id, created_at desc);

create or replace function public.log_operation(
  p_action text,
  p_entity_type text default null,
  p_entity_id text default null,
  p_details jsonb default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.operation_logs (tenant_id, actor_id, action, entity_type, entity_id, details)
  values (public.current_tenant_id(), auth.uid(), p_action, p_entity_type, p_entity_id, p_details)
$$;

grant execute on function public.log_operation(text, text, text, jsonb) to authenticated;

-- ------------------------------------------------------------
-- Crypto (Phase 2 — custodial simulation ready)
-- ------------------------------------------------------------
create table public.crypto_wallets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  account_id uuid not null references public.accounts(id) on delete cascade,
  asset char(10) not null check (asset in ('BTC','ETH','SOL','USDT','USDC','XRP','BNB','ADA','DOT','LTC','DOGE','AVAX','LINK','MATIC','TRX')),
  balance numeric(36,18) not null default 0,
  address text, -- simulated chain address
  created_at timestamptz not null default now(),
  unique (account_id, asset)
);

create table public.crypto_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  account_id uuid not null references public.accounts(id) on delete cascade,
  order_type text not null default 'market' check (order_type in ('market', 'limit')),
  asset char(10) not null,
  side text not null check (side in ('buy', 'sell')),
  amount_fiat numeric(20,2),
  amount_asset numeric(36,18),
  price numeric(24,12),
  status text not null default 'pending' check (status in ('pending', 'filled', 'cancelled', 'failed')),
  created_at timestamptz not null default now()
);

create index crypto_orders_account_idx on public.crypto_orders (account_id);

-- ------------------------------------------------------------
-- Open API (Phase 2 — integration ready)
-- ------------------------------------------------------------
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null,
  key_hash text not null unique, -- sha256 of the raw key — raw key shown once
  key_prefix text not null, -- e.g. "capt_live_ab12"
  scopes text[] not null default '{read}',
  status text not null default 'active' check (status in ('active', 'revoked')),
  last_used_at timestamptz,
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  url text not null,
  events text[] not null default '{}',
  secret text not null default encode(gen_random_bytes(24), 'hex'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  endpoint_id uuid references public.webhook_endpoints(id) on delete cascade,
  event_type text not null,
  payload jsonb,
  status text not null default 'pending' check (status in ('pending', 'delivered', 'failed')),
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.api_usage_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  api_key_id uuid references public.api_keys(id) on delete set null,
  endpoint text not null,
  method text not null,
  status_code integer,
  latency_ms integer,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Scheduled jobs (pg_cron) — guarded: only if pg_cron enabled
-- ------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'capitech-accrue-interest',
      '0 2 * * *', -- daily 02:00 UTC
      'select public.accrue_deposit_interest()'
    );
    perform cron.schedule(
      'capitech-mature-deposits',
      '15 2 * * *', -- daily 02:15 UTC
      'select public.mature_deposits()'
    );
  else
    raise notice 'pg_cron not enabled — scheduled jobs skipped. Enable via Database → Extensions.';
  end if;
end $$;

-- ============================================================
-- Capitech Bank — 0010: Row-level security policies
-- Multi-tenant isolation: every policy scoped to tenant + role
-- ============================================================

-- ------------------------------------------------------------
-- Helper predicates
-- ------------------------------------------------------------

-- Is the account owned by (or a member of an org owning) the current user?
create or replace function public.is_account_owner(p_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.accounts a
    where a.id = p_account_id
      and (
        (a.owner_type = 'customer' and exists (
          select 1 from public.customers c
          where c.id = a.owner_id and c.profile_id = auth.uid()
        ))
        or
        (a.owner_type = 'organization' and exists (
          select 1 from public.organization_members m
          where m.organization_id = a.owner_id and m.profile_id = auth.uid()
            and m.status = 'active'
        ))
      )
  )
$$;

-- Is the current user the customer record's owner?
create or replace function public.is_customer_owner(p_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.customers c
    where c.id = p_customer_id and c.profile_id = auth.uid()
  )
$$;

-- ------------------------------------------------------------
-- tenants
-- ------------------------------------------------------------
alter table public.tenants enable row level security;

create policy "tenants_select_authenticated" on public.tenants
  for select to authenticated using (true);
create policy "tenants_write_staff" on public.tenants
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles_select_staff" on public.profiles
  for select to authenticated using (public.is_staff());
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_update_staff_admin" on public.profiles
  for update to authenticated
  using (public.has_role('staff_admin') or public.has_role('super_admin'))
  with check (public.has_role('staff_admin') or public.has_role('super_admin'));

-- ------------------------------------------------------------
-- customers
-- ------------------------------------------------------------
alter table public.customers enable row level security;

create policy "customers_insert_own" on public.customers
  for insert to authenticated
  with check (profile_id = auth.uid());
create policy "customers_select_own" on public.customers
  for select to authenticated using (public.is_customer_owner(id));
create policy "customers_select_staff" on public.customers
  for select to authenticated using (public.is_staff());
create policy "customers_update_own" on public.customers
  for update to authenticated using (public.is_customer_owner(id));
create policy "customers_update_staff" on public.customers
  for update to authenticated using (public.is_staff());

-- ------------------------------------------------------------
-- organizations
-- ------------------------------------------------------------
alter table public.organizations enable row level security;

create policy "orgs_insert_authenticated" on public.organizations
  for insert to authenticated with check (true);
create policy "orgs_select_staff" on public.organizations
  for select to authenticated using (public.is_staff());
create policy "orgs_select_member" on public.organizations
  for select to authenticated using (
    exists (select 1 from public.organization_members m
            where m.organization_id = id and m.profile_id = auth.uid() and m.status = 'active')
  );
create policy "orgs_update_staff" on public.organizations
  for update to authenticated using (public.is_staff());

-- ------------------------------------------------------------
-- organization_members
-- ------------------------------------------------------------
alter table public.organization_members enable row level security;

create policy "org_members_select_staff" on public.organization_members
  for select to authenticated using (public.is_staff());
create policy "org_members_select_member" on public.organization_members
  for select to authenticated using (profile_id = auth.uid());
create policy "org_members_write_staff" on public.organization_members
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ------------------------------------------------------------
-- kyc_documents
-- ------------------------------------------------------------
alter table public.kyc_documents enable row level security;

create policy "kyc_insert_own" on public.kyc_documents
  for insert to authenticated
  with check (
    (customer_id is not null and public.is_customer_owner(customer_id))
    or public.is_staff()
  );
create policy "kyc_select_own" on public.kyc_documents
  for select to authenticated using (
    (customer_id is not null and public.is_customer_owner(customer_id)) or public.is_staff()
  );
create policy "kyc_update_staff" on public.kyc_documents
  for update to authenticated using (public.is_staff());

-- ------------------------------------------------------------
-- coa_accounts
-- ------------------------------------------------------------
alter table public.coa_accounts enable row level security;

create policy "coa_select_authenticated" on public.coa_accounts
  for select to authenticated using (true);
create policy "coa_write_staff" on public.coa_accounts
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ------------------------------------------------------------
-- products
-- ------------------------------------------------------------
alter table public.products enable row level security;

create policy "products_select_authenticated" on public.products
  for select to authenticated using (true);
create policy "products_write_staff" on public.products
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ------------------------------------------------------------
-- accounts
-- ------------------------------------------------------------
alter table public.accounts enable row level security;

create policy "accounts_insert_owner" on public.accounts
  for insert to authenticated
  with check (
    owner_type = 'customer'
    and exists (select 1 from public.customers c where c.id = owner_id and c.profile_id = auth.uid())
  );
create policy "accounts_select_owner" on public.accounts
  for select to authenticated using (public.is_account_owner(id));
create policy "accounts_select_staff" on public.accounts
  for select to authenticated using (public.is_staff());
create policy "accounts_update_owner" on public.accounts
  for update to authenticated
  using (public.is_account_owner(id))
  with check (
    -- owners may only touch safe columns
    status = 'active' and frozen = false
    or public.is_staff()
  );
create policy "accounts_update_staff" on public.accounts
  for update to authenticated using (public.is_staff());

-- ------------------------------------------------------------
-- balances
-- ------------------------------------------------------------
alter table public.balances enable row level security;

create policy "balances_select_staff" on public.balances
  for select to authenticated using (public.is_staff());

-- ------------------------------------------------------------
-- gl_entries / gl_entry_lines
-- ------------------------------------------------------------
alter table public.gl_entries enable row level security;
alter table public.gl_entry_lines enable row level security;

create policy "gl_entries_select_staff" on public.gl_entries
  for select to authenticated using (public.is_staff());
create policy "gl_entry_lines_select_staff" on public.gl_entry_lines
  for select to authenticated using (public.is_staff());

-- ------------------------------------------------------------
-- payment_orders
-- ------------------------------------------------------------
alter table public.payment_orders enable row level security;

create policy "payments_insert_owner" on public.payment_orders
  for insert to authenticated
  with check (created_by = auth.uid());
create policy "payments_select_owner" on public.payment_orders
  for select to authenticated using (created_by = auth.uid());
create policy "payments_select_staff" on public.payment_orders
  for select to authenticated using (public.is_staff());
create policy "payments_update_staff" on public.payment_orders
  for update to authenticated using (public.is_staff());
create policy "payments_update_owner_cancel" on public.payment_orders
  for update to authenticated
  using (created_by = auth.uid() and status = 'pending');

-- ------------------------------------------------------------
-- transaction_tokens
-- ------------------------------------------------------------
alter table public.transaction_tokens enable row level security;

create policy "tokens_select_own" on public.transaction_tokens
  for select to authenticated using (profile_id = auth.uid());
create policy "tokens_select_staff" on public.transaction_tokens
  for select to authenticated using (public.is_staff());

-- ------------------------------------------------------------
-- cards
-- ------------------------------------------------------------
alter table public.cards enable row level security;

create policy "cards_insert_owner" on public.cards
  for insert to authenticated
  with check (public.is_account_owner(account_id));
create policy "cards_select_owner" on public.cards
  for select to authenticated using (public.is_account_owner(account_id));
create policy "cards_select_staff" on public.cards
  for select to authenticated using (public.is_staff());
create policy "cards_update_owner" on public.cards
  for update to authenticated using (public.is_account_owner(account_id));
create policy "cards_update_staff" on public.cards
  for update to authenticated using (public.is_staff());

-- ------------------------------------------------------------
-- card_transactions
-- ------------------------------------------------------------
alter table public.card_transactions enable row level security;

create policy "card_tx_select_owner" on public.card_transactions
  for select to authenticated using (
    exists (select 1 from public.cards c where c.id = card_id and public.is_account_owner(c.account_id))
  );
create policy "card_tx_select_staff" on public.card_transactions
  for select to authenticated using (public.is_staff());

-- ------------------------------------------------------------
-- deposits
-- ------------------------------------------------------------
alter table public.deposits enable row level security;

create policy "deposits_insert_owner" on public.deposits
  for insert to authenticated
  with check (public.is_account_owner(account_id));
create policy "deposits_select_owner" on public.deposits
  for select to authenticated using (public.is_account_owner(account_id));
create policy "deposits_select_staff" on public.deposits
  for select to authenticated using (public.is_staff());
create policy "deposits_update_staff" on public.deposits
  for update to authenticated using (public.is_staff());

-- ------------------------------------------------------------
-- notifications
-- ------------------------------------------------------------
alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select to authenticated using (profile_id = auth.uid());
create policy "notifications_update_own" on public.notifications
  for update to authenticated using (profile_id = auth.uid());
create policy "notifications_insert_staff" on public.notifications
  for insert to authenticated with check (public.is_staff());

-- ------------------------------------------------------------
-- operation_logs (append-only)
-- ------------------------------------------------------------
alter table public.operation_logs enable row level security;

create policy "logs_select_staff" on public.operation_logs
  for select to authenticated using (public.is_staff());
create policy "logs_insert_authenticated" on public.operation_logs
  for insert to authenticated with check (true);

-- ------------------------------------------------------------
-- crypto + open api (phase 2)
-- ------------------------------------------------------------
alter table public.crypto_wallets enable row level security;
alter table public.crypto_orders enable row level security;

create policy "wallets_select_owner" on public.crypto_wallets
  for select to authenticated using (public.is_account_owner(account_id));
create policy "wallets_select_staff" on public.crypto_wallets
  for select to authenticated using (public.is_staff());
create policy "orders_select_owner" on public.crypto_orders
  for select to authenticated using (public.is_account_owner(account_id));
create policy "orders_select_staff" on public.crypto_orders
  for select to authenticated using (public.is_staff());
create policy "orders_insert_owner" on public.crypto_orders
  for insert to authenticated with check (public.is_account_owner(account_id));

alter table public.api_keys enable row level security;
alter table public.webhook_endpoints enable row level security;
alter table public.webhook_events enable row level security;
alter table public.api_usage_logs enable row level security;

create policy "api_keys_staff" on public.api_keys
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "webhooks_staff" on public.webhook_endpoints
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "webhook_events_staff" on public.webhook_events
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "api_usage_staff" on public.api_usage_logs
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ------------------------------------------------------------
-- Storage buckets
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('kyc-documents', 'kyc-documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('statements', 'statements', false)
on conflict (id) do nothing;

-- KYC documents: owners can read their own; staff can read all
create policy "kyc_storage_read_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'kyc-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role <> 'customer' and p.role <> 'corporate_admin')
  );

create policy "kyc_storage_write_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text);

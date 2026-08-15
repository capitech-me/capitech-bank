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

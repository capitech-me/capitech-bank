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

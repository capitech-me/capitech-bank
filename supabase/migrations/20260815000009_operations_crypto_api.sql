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
-- Scheduled jobs (pg_cron)
-- ------------------------------------------------------------
select cron.schedule(
  'capitech-accrue-interest',
  '0 2 * * *', -- daily 02:00 UTC
  'select public.accrue_deposit_interest()'
);

select cron.schedule(
  'capitech-mature-deposits',
  '15 2 * * *', -- daily 02:15 UTC
  'select public.mature_deposits()'
);

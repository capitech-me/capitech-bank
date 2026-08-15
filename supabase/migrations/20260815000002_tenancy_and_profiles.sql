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

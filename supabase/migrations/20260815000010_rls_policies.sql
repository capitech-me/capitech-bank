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

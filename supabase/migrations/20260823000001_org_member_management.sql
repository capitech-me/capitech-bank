-- ============================================================
-- Capitech Bank — Migration 0014: Corporate team management (C9)
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
-- organizations — owner may read their own organization even if
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
-- organization_members — org owner can SELECT / INSERT / UPDATE / DELETE
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
-- profiles — same-tenant lookup for org owners.
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

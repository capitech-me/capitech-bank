-- ============================================================
-- Capitech Bank — 20260823000003: Notification preferences
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

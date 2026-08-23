-- ============================================================
-- Capitech Bank — Migration 0015: Contact messages (C11)
-- Powers the real contact form on the landing site (/contact)
-- plus the staff-only inbox in the admin app (/admin/contact).
--
-- Additive + idempotent (create-if-not-exists + drop-policy-then-
-- recreate). Rerunning is safe.
--
-- RLS model:
--   INSERT  anon + authenticated  (any visitor may submit a message;
--           contact data is intentionally not sensitive — email is
--           captured solely so support can reply)
--   SELECT  staff only
--   UPDATE  staff only          (status: new -> responded -> closed)
-- ============================================================

-- ------------------------------------------------------------
-- contact_messages
-- ------------------------------------------------------------
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  name text not null,
  email text not null,
  subject text,
  message text not null,
  status text not null default 'new'
    check (status in ('new', 'responded', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_status_idx on public.contact_messages (status);
create index if not exists contact_messages_created_at_idx on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

-- ------------------------------------------------------------
-- INSERT — anon + authenticated visitors (landing site)
-- `with check (true)` is deliberate: the table itself enforces
-- NOT NULL on email/name/message, and message capture is safe.
-- ------------------------------------------------------------
drop policy if exists "contact_messages_insert_public" on public.contact_messages;
create policy "contact_messages_insert_public" on public.contact_messages
  for insert to anon, authenticated
  with check (true);

-- ------------------------------------------------------------
-- SELECT — staff only (admin app)
-- ------------------------------------------------------------
drop policy if exists "contact_messages_select_staff" on public.contact_messages;
create policy "contact_messages_select_staff" on public.contact_messages
  for select to authenticated
  using (public.is_staff());

-- ------------------------------------------------------------
-- UPDATE — staff only (Mark responded / Close)
-- ------------------------------------------------------------
drop policy if exists "contact_messages_update_staff" on public.contact_messages;
create policy "contact_messages_update_staff" on public.contact_messages
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

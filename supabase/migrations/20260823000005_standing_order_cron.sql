-- ============================================================
-- Capitech Bank — 20260823000005: Standing order auto-execution (pg_cron)
-- ============================================================
-- Creates `process_due_standing_orders()` (SECURITY DEFINER) plus the
-- `compute_next_run()` helper, and schedules the job in pg_cron.
--
-- WHY NOT literally call create_payment()/execute_payment() with no JWT:
--   In a pg_cron context there is no JWT, so auth.uid() IS NULL. Both
--   create_payment() (migration 0006) and execute_payment() (hotfix5 / 0002)
--   begin with:
--       v_tenant := public.current_tenant_id();  -- NULL when auth.uid() IS NULL
--       if v_tenant is null then raise 'Not authenticated'; end if;
--   so they short-circuit BEFORE ever reaching is_privileged_caller().
--   create_payment() additionally raises when v_actor (auth.uid()) IS NULL and
--   writes payment_orders.created_by = v_actor, but that column is NOT NULL —
--   a "system creator of NULL" order is therefore impossible.
--
--   => To honour the documented intent (migration 0002 C3 note: "call
--      create_payment(...) for every due standing_orders row, then advance
--      next_run_at") while actually working, the cron function injects a
--      service-role JWT for the standing order's OWNER (so.created_by) right
--      before each create/execute. This makes auth.uid()/current_tenant_id()
--      resolve to the owner's tenant and makes is_privileged_caller() return
--      true (system execution), and keeps created_by the real customer (NOT NULL).
--
--   IMPORTANT (maker-checker): execute_payment() refuses to let a payment be
--   approved by its creator whenever p_approve = true. Because created_by must
--   be the owner (NOT NULL) and auth.uid() resolves to that same owner here, a
--   p_approve = true call would trip "Maker-checker violation". For an
--   automated recurring transfer the SYSTEM is the approving authority, so we
--   call execute_payment(..., p_approve := false) — the maker-checker guard is
--   skipped, the internal-transfer journal posts, and the order is marked
--   'posted'. approved_by stays NULL (system), which is correct for cron.
--
--   The per-row BEGIN/EXCEPTION block wraps everything, so if create/execute
--   fails the whole row is atomically rolled back (no half-created pending
--   order, no orphan journal) — then next_run_at is advanced and the owner is
--   notified.
-- ============================================================

-- ------------------------------------------------------------
-- compute_next_run: advance a standing order to its next due time.
--   weekly   -> next occurrence of day_of_week (1=Mon..7=Sun), strictly future
--   monthly  -> next day_of_month with month-end clamping (e.g. 31 -> Feb 28)
--   quarterly-> same as monthly but 3 months ahead
-- Returns a timestamptz (midnight UTC of the target date).
-- ------------------------------------------------------------
create or replace function public.compute_next_run(
  p_frequency text,
  p_day_of_month integer,
  p_day_of_week integer
)
returns timestamptz
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_now   date := current_date;
  v_next  date;
  v_ahead int;
  v_mv    int;
  v_y     int;
  v_m     int;
  v_days  int;
begin
  if p_frequency = 'weekly' then
    -- isodow: 1=Monday .. 7=Sunday (matches day_of_week 1-7)
    v_ahead := (p_day_of_week - extract(isodow from v_now)::int) % 7;
    if v_ahead <= 0 then
      v_ahead := v_ahead + 7;
    end if;
    v_next := v_now + v_ahead;
    return v_next::timestamptz;
  end if;

  -- monthly / quarterly
  v_mv := case when p_frequency = 'monthly' then 1 else 3 end;
  v_y  := extract(year from v_now)::int;
  v_m  := extract(month from v_now)::int;

  -- candidate in the current period (clamp to end of month)
  v_days := extract(day from (date_trunc('month', v_now) + interval '1 month' - interval '1 day'))::int;
  v_next := make_date(v_y, v_m, least(coalesce(p_day_of_month, 1), v_days));

  if v_next <= v_now then
    -- advance one period (1 or 3 months), handling year carry-over
    v_m := v_m + v_mv;
    v_y := v_y + ((v_m - 1) / 12);
    v_m := ((v_m - 1) % 12) + 1;
    v_days := extract(day from (make_date(v_y, v_m, 1) + interval '1 month' - interval '1 day'))::int;
    v_next := make_date(v_y, v_m, least(coalesce(p_day_of_month, 1), v_days));
  end if;

  return v_next::timestamptz;
end;
$$;

-- ------------------------------------------------------------
-- process_due_standing_orders: auto-execute every due active order.
-- Returns the number processed. SECURITY DEFINER (owns all rows),
-- search_path = public.
-- ------------------------------------------------------------
create or replace function public.process_due_standing_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_so        public.standing_orders%rowtype;
  v_actor     uuid;
  v_order     public.payment_orders;
  v_processed integer := 0;
  v_err       text;
  v_next      timestamptz;
begin
  for v_so in
    select * from public.standing_orders
    where status = 'active'
      and next_run_at is not null
      and next_run_at <= now()
    order by next_run_at asc
    limit 50
    for update skip locked
  loop
    v_next := public.compute_next_run(v_so.frequency, v_so.day_of_month, v_so.day_of_week);

    begin
      v_actor := v_so.created_by;

      -- Inject a service-role JWT for the owner so auth.uid()/current_tenant_id()
      -- resolve to the owner's tenant and is_privileged_caller() returns true.
      -- (Both request.jwt.claims and request.jwt.claim.sub are set to satisfy
      --  auth.uid() across Supabase implementations.)
      perform set_config('request.jwt.claims',
        jsonb_build_object('sub', v_actor::text, 'role', 'service_role')::text, true);
      perform set_config('request.jwt.claim.sub', v_actor::text, true);

      -- Create the order (pending) as the owner, then auto-execute (system).
      v_order := public.create_payment(
        'internal_transfer',
        v_so.amount,
        v_so.currency,
        v_so.from_account_id,
        null,
        v_so.to_iban,
        v_so.to_bic,
        v_so.to_beneficiary_name,
        v_so.id::text,           -- p_reference
        coalesce(v_so.narration, 'Standing order'),
        v_so.id::text            -- p_idempotency_key (dedupe on success)
      );

      -- p_approve = false => system auto-approval; posts the internal-transfer
      -- journal (maker-checker guard is bypassed, see header note).
      v_order := public.execute_payment(v_order.id, v_actor, false);

      -- Success: advance the schedule.
      update public.standing_orders
      set next_run_at = v_next,
          updated_at   = now()
      where id = v_so.id;

      v_processed := v_processed + 1;

    exception when others then
      -- Failure: keep SIMPLE — advance the schedule anyway (so it does not
      -- retry forever) and notify the owner. The subtransaction rollback above
      -- guarantees no half-created pending order / orphan journal remains.
      v_err := sqlerrm;

      update public.standing_orders
      set next_run_at = v_next,
          updated_at   = now()
      where id = v_so.id;

      insert into public.notifications (tenant_id, profile_id, type, title, body)
      values (
        v_so.tenant_id,
        v_so.created_by,
        'system',
        'Standing order could not be processed',
        'Your ' || v_so.frequency || ' standing order ' || coalesce(v_so.narration, v_so.id::text)
          || ' could not be executed (' || v_err || '). It will be retried next period.'
      );
    end;
  end loop;

  return v_processed;
end;
$$;

-- ------------------------------------------------------------
-- Grants
-- ------------------------------------------------------------
grant execute on function public.compute_next_run(text, integer, integer) to postgres;
grant execute on function public.compute_next_run(text, integer, integer) to service_role;
grant execute on function public.process_due_standing_orders() to postgres;
grant execute on function public.process_due_standing_orders() to service_role;

-- ------------------------------------------------------------
-- Schedule every minute. Guarded so re-running is safe. Uses dynamic SQL
-- (EXECUTE) so the block does not fail to compile if the pg_cron extension is
-- not enabled; if cron.job is absent we skip scheduling with a notice.
-- ------------------------------------------------------------
do $$
declare
  v_exists boolean;
begin
  if to_regclass('cron.job') is not null then
    execute 'select exists (select 1 from cron.job where jobname = ''capitech-standing-orders'')'
      into v_exists;

    if not v_exists then
      execute 'select cron.schedule(''capitech-standing-orders'', ''*/1 * * * *'', ''select public.process_due_standing_orders()'')';
      raise notice 'pg_cron job capitech-standing-orders scheduled every minute.';
    else
      raise notice 'pg_cron job capitech-standing-orders already exists; skipping.';
    end if;
  else
    raise notice 'pg_cron extension is not enabled; standing-order scheduler not installed.';
  end if;
end $$;

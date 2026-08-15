-- ============================================================
-- Capitech Bank — seed.sql
-- Demo data. Run AFTER migrations via:
--   supabase db reset  (local)  or  psql -f seed.sql
-- NOTE: auth users cannot be created in pure SQL. Create a user
-- via the dashboard / sign-up flow first, then run:
--   supabase db reset --seed
-- ============================================================

-- ------------------------------------------------------------
-- Demo staff profiles need auth.users rows; we attach roles via
-- the profiles trigger on signup. To promote a user to staff:
--   update public.profiles set role = 'staff_admin'
--   where id = '<auth user id>';
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- Demo customer (retail) — requires an existing auth user id
-- ------------------------------------------------------------
-- Replace '<AUTH_USER_ID>' with a real auth.users.id before running.
do $$
declare
  v_user_id uuid := '<AUTH_USER_ID>';
  v_tenant uuid := (select id from public.tenants where slug = 'capitech');
  v_customer uuid;
  v_acct_usd uuid;
  v_acct_eur uuid;
  v_acct_gbp uuid;
  v_nostro uuid;
begin
  if v_user_id = '<AUTH_USER_ID>' then
    raise notice 'Skipping seed: set <AUTH_USER_ID> to a real auth user id first.';
    return;
  end if;

  -- ensure profile
  insert into public.profiles (id, tenant_id, role, first_name, last_name)
  values (v_user_id, v_tenant, 'customer', 'Jane', 'Doe')
  on conflict (id) do update set role = 'customer';

  -- customer record
  insert into public.customers (
    tenant_id, profile_id, customer_no, customer_type, kyc_level, kyc_status,
    legal_first_name, legal_last_name, date_of_birth, nationality,
    country_of_residence, address_line1, city, risk_score
  ) values (
    v_tenant, v_user_id, 'CAP-000100', 'retail', 'level_2', 'approved',
    'Jane', 'Doe', '1990-04-12', 'US', 'US', '123 Market Street', 'New York', 10
  )
  on conflict (customer_no) do nothing
  returning id into v_customer;

  -- accounts via the official function
  select id into v_acct_usd from public.accounts where account_no = '1002345678';
  if v_acct_usd is null then
    insert into public.accounts (
      tenant_id, account_no, iban, swift_bic, product_id, coa_account_id,
      owner_type, owner_id, currency, status, nickname, ledger_balance, available_balance
    )
    select t.id, '1002345678', 'US' || '23' || lpad('CAPT1002345678', 18, '0'),
           'CAPTUSXX', p.id, p.coa_account_id, 'customer', v_customer, 'USD',
           'active', 'Everyday', 24580.42, 24580.42
    from public.tenants t
    cross join public.products p
    where t.slug = 'capitech' and p.code = 'CUR_USD'
    returning id into v_acct_usd;
  end if;

  select id into v_acct_eur from public.accounts where account_no = '1008765432';
  if v_acct_eur is null then
    insert into public.accounts (
      tenant_id, account_no, iban, swift_bic, product_id, coa_account_id,
      owner_type, owner_id, currency, status, nickname, ledger_balance, available_balance
    )
    select t.id, '1008765432', 'US' || '42' || lpad('CAPT1008765432', 18, '0'),
           'CAPTUSXX', p.id, p.coa_account_id, 'customer', v_customer, 'EUR',
           'active', 'Travel', 12340.00, 12340.00
    from public.tenants t
    cross join public.products p
    where t.slug = 'capitech' and p.code = 'CUR_EUR'
    returning id into v_acct_eur;
  end if;

  select id into v_acct_gbp from public.accounts where account_no = '2200112233';
  if v_acct_gbp is null then
    insert into public.accounts (
      tenant_id, account_no, iban, swift_bic, product_id, coa_account_id,
      owner_type, owner_id, currency, status, nickname, ledger_balance, available_balance
    )
    select t.id, '2200112233', 'GB' || '12' || lpad('CAPT2200112233', 18, '0'),
           'CAPTGBXX', p.id, p.coa_account_id, 'customer', v_customer, 'GBP',
           'active', 'Rainy day', 8120.50, 8120.50
    from public.tenants t
    cross join public.products p
    where t.slug = 'capitech' and p.code = 'SAV_USD'
    returning id into v_acct_gbp;
  end if;

  -- mirror balances on the COA side so the ledger is consistent
  select id into v_nostro from public.coa_accounts where tenant_id = v_tenant and code = '1100';

  insert into public.balances (tenant_id, coa_account_id, currency, ledger_balance, available_balance)
  values
    (v_tenant, v_nostro, 'USD', 24580.42, 24580.42),
    (v_tenant, v_nostro, 'EUR', 12340.00, 12340.00),
    (v_tenant, v_nostro, 'GBP', 8120.50, 8120.50)
  on conflict (coa_account_id, currency) do nothing;

  raise notice 'Seed complete for user %.', v_user_id;
end $$;

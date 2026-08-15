-- ============================================================
-- Capitech Bank — 0005: Accounts, balances and the ledger engine
-- ============================================================

-- ------------------------------------------------------------
-- accounts: customer-facing banking accounts
-- ------------------------------------------------------------
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  account_no text not null unique,
  iban text,
  swift_bic text,
  product_id uuid not null references public.products(id) on delete restrict,
  coa_account_id uuid references public.coa_accounts(id) on delete restrict,
  owner_type text not null check (owner_type in ('customer', 'organization')),
  owner_id uuid not null,
  currency char(3) not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'frozen', 'closed')),
  nickname text,
  ledger_balance numeric(20,2) not null default 0,
  available_balance numeric(20,2) not null default 0,
  daily_transfer_limit numeric(20,2),
  frozen boolean not null default false,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index accounts_tenant_idx on public.accounts (tenant_id);
create index accounts_owner_idx on public.accounts (owner_type, owner_id);
create index accounts_currency_idx on public.accounts (currency);

-- ------------------------------------------------------------
-- balances: per-COA-account, per-currency running balances
-- ------------------------------------------------------------
create table public.balances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  coa_account_id uuid not null references public.coa_accounts(id) on delete restrict,
  currency char(3) not null,
  ledger_balance numeric(24,6) not null default 0,
  available_balance numeric(24,6) not null default 0,
  last_transaction_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (coa_account_id, currency)
);

create index balances_tenant_idx on public.balances (tenant_id);

-- ------------------------------------------------------------
-- gl_entries + gl_entry_lines: immutable double-entry journals
-- ------------------------------------------------------------
create table public.gl_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  journal_no text not null unique,
  entry_date timestamptz not null default now(),
  post_date timestamptz not null default now(),
  description text not null,
  reference_type text,
  reference_id text,
  status text not null default 'posted' check (status in ('draft', 'posted', 'reversed')),
  created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create index gl_entries_tenant_idx on public.gl_entries (tenant_id);
create index gl_entries_reference_idx on public.gl_entries (reference_type, reference_id);

create table public.gl_entry_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  entry_id uuid not null references public.gl_entries(id) on delete cascade,
  coa_account_id uuid references public.coa_accounts(id) on delete restrict,
  customer_account_id uuid references public.accounts(id) on delete restrict,
  currency char(3) not null,
  debit numeric(20,2) not null default 0 check (debit >= 0),
  credit numeric(20,2) not null default 0 check (credit >= 0),
  memo text,
  created_at timestamptz not null default now(),
  check (coa_account_id is not null or customer_account_id is not null),
  check (not (debit > 0 and credit > 0))
);

create index gl_lines_entry_idx on public.gl_entry_lines (entry_id);
create index gl_lines_account_idx on public.gl_entry_lines (coa_account_id);
create index gl_lines_customer_account_idx on public.gl_entry_lines (customer_account_id);

-- ------------------------------------------------------------
-- helpers
-- ------------------------------------------------------------
create or replace function public.generate_account_no()
returns text
language sql
stable
as $$
  select lpad(floor(random() * 1e11)::bigint::text, 11, '0')
$$;

-- journal numbering: GL-YYYYMMDD-<seq>
create sequence if not exists public.journal_seq;

create or replace function public.next_journal_no()
returns text
language sql
stable
as $$
  select 'GL-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.journal_seq')::text, 6, '0')
$$;

-- ------------------------------------------------------------
-- open_account: create account + IBAN + initial balance row
-- ------------------------------------------------------------
create or replace function public.open_account(
  p_owner_type text,
  p_owner_id uuid,
  p_product_id uuid,
  p_currency char(3),
  p_nickname text default null
)
returns public.accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_product public.products%rowtype;
  v_account public.accounts;
  v_country char(2);
begin
  if v_tenant is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_product from public.products where id = p_product_id and tenant_id = v_tenant;
  if v_product is null then
    raise exception 'Product not found';
  end if;
  if v_product.status <> 'active' then
    raise exception 'Product is not active';
  end if;
  if v_product.currency is not null and v_product.currency <> p_currency then
    raise exception 'Product is restricted to currency %', v_product.currency;
  end if;

  -- owner must exist in this tenant
  if p_owner_type = 'customer' then
    if not exists (select 1 from public.customers where id = p_owner_id and tenant_id = v_tenant) then
      raise exception 'Customer not found';
    end if;
  elsif p_owner_type = 'organization' then
    if not exists (select 1 from public.organizations where id = p_owner_id and tenant_id = v_tenant) then
      raise exception 'Organization not found';
    end if;
  else
    raise exception 'Invalid owner type';
  end if;

  select country into v_country from public.tenants where id = v_tenant;

  insert into public.accounts (
    tenant_id, account_no, iban, swift_bic, product_id, coa_account_id,
    owner_type, owner_id, currency, status, nickname, daily_transfer_limit
  )
  values (
    v_tenant,
    public.generate_account_no(),
    null, -- filled by trigger below (needs account_no)
    'CAPT' || v_country || 'XX',
    p_product_id,
    v_product.coa_account_id,
    p_owner_type, p_owner_id, p_currency,
    'active', p_nickname,
    v_product.daily_transfer_limit
  )
  returning * into v_account;

  -- initial zero balance row
  insert into public.balances (tenant_id, coa_account_id, currency)
  values (v_tenant, v_product.coa_account_id, p_currency)
  on conflict (coa_account_id, currency) do nothing;

  return v_account;
end;
$$;

-- ------------------------------------------------------------
-- IBAN trigger: derive from account_no once inserted
-- (see packages/lib/src/iban.ts for the mod-97 implementation)
-- ------------------------------------------------------------
create or replace function public.fill_iban()
returns trigger
language plpgsql
as $$
declare
  v_country char(2);
  v_bban text;
  v_check int;
  v_iban text;
begin
  select country into v_country from public.tenants where id = new.tenant_id;

  -- BBAN = bank code + account number, padded to 18 digits (DE-style sandbox)
  v_bban := lpad('CAPT' || new.account_no, 18, '0');
  v_iban := v_country || '00' || v_bban;

  -- mod-97 check digit calculation
  v_check := 98 - (public.iban_mod97(v_iban)::int);
  new.iban := v_country || lpad(v_check::text, 2, '0') || v_bban;

  return new;
end;
$$;

-- mod-97 helper (pure SQL, ECBS/ISO 13616 algorithm)
create or replace function public.iban_mod97(p_iban text)
returns numeric
language plpgsql
immutable
as $$
declare
  v_rearranged text := substr(p_iban, 5) || substr(p_iban, 1, 4);
  v_char text;
  v_rem numeric := 0;
begin
  for i in 1..length(v_rearranged) loop
    v_char := substr(v_rearranged, i, 1);
    if v_char ~ '[A-Z]' then
      v_char := (ascii(v_char) - 55)::text;
    end if;
    -- chunked mod-97 to avoid overflow
    for j in 1..length(v_char) loop
      v_rem := mod(v_rem * 10 + (substr(v_char, j, 1))::int, 97);
    end loop;
  end loop;
  return v_rem;
end;
$$;

-- placeholder overridden by the account_no version (IBAN moved to app layer via API)
drop trigger if exists fill_iban_trigger on public.accounts;
create trigger fill_iban_trigger
  before insert on public.accounts
  for each row when (new.iban is null)
  execute function public.fill_iban();

-- ------------------------------------------------------------
-- post_journal — THE single write path of the ledger
-- ------------------------------------------------------------
create or replace function public.post_journal(
  p_description text,
  p_lines jsonb,
  p_reference_type text default null,
  p_reference_id text default null,
  p_entry_date timestamptz default now(),
  p_tenant uuid default null,
  p_actor uuid default auth.uid()
)
returns public.gl_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := coalesce(p_tenant, public.current_tenant_id());
  v_entry public.gl_entries;
  v_line jsonb;
  v_kind text;
  v_account_id uuid;
  v_coa_id uuid;
  v_currency char(3);
  v_debit numeric(20,2);
  v_credit numeric(20,2);
  v_memo text;
  v_dr_sum numeric(20,2) := 0;
  v_cr_sum numeric(20,2) := 0;
  v_bal public.accounts%rowtype;
  v_coa_bal public.balances%rowtype;
  v_normal_side text;
  v_available numeric(20,2);
begin
  if v_tenant is null then
    raise exception 'Not authenticated';
  end if;
  if jsonb_array_length(p_lines) = 0 then
    raise exception 'Journal must contain at least one line';
  end if;

  -- Validate lines & compute per-currency balances (simple: whole journal per currency)
  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_kind := v_line ->> 'account_kind';
    v_account_id := (v_line ->> 'account_id')::uuid;
    v_currency := v_line ->> 'currency';
    v_debit := coalesce((v_line ->> 'debit')::numeric, 0);
    v_credit := coalesce((v_line ->> 'credit')::numeric, 0);
    v_memo := v_line ->> 'memo';

    if v_kind = 'customer' then
      select * into v_bal from public.accounts where id = v_account_id;
      if v_bal is null then
        raise exception 'Account % not found', v_account_id;
      end if;
      if v_bal.tenant_id <> v_tenant then
        raise exception 'Account % not in tenant', v_account_id;
      end if;
      if v_bal.currency <> v_currency then
        raise exception 'Account % currency mismatch (% <> %)', v_account_id, v_bal.currency, v_currency;
      end if;
      if v_bal.status <> 'active' or v_bal.frozen then
        raise exception 'Account % is not available for transactions', v_account_id;
      end if;
      if v_debit > 0 then
        if v_debit > v_bal.available_balance + 0.0001 then
          raise exception 'Insufficient funds on account % (available % < debit %)', v_account_id, v_bal.available_balance, v_debit;
        end if;
      end if;
      v_dr_sum := v_dr_sum + v_debit;
      v_cr_sum := v_cr_sum + v_credit;
    elsif v_kind = 'coa' then
      v_coa_id := v_account_id;
      select * into v_coa_bal from public.coa_accounts where id = v_coa_id;
      if v_coa_bal is null or v_coa_bal.tenant_id <> v_tenant then
        raise exception 'COA account % not found', v_coa_id;
      end if;
      v_dr_sum := v_dr_sum + v_debit;
      v_cr_sum := v_cr_sum + v_credit;
    else
      raise exception 'Invalid account_kind: %', v_kind;
    end if;
  end loop;

  if v_dr_sum <> v_cr_sum then
    raise exception 'Journal does not balance: debits % <> credits %', v_dr_sum, v_cr_sum;
  end if;

  -- Create the entry
  insert into public.gl_entries (
    tenant_id, journal_no, entry_date, post_date, description,
    reference_type, reference_id, status, created_by, approved_by, approved_at
  )
  values (
    v_tenant, public.next_journal_no(), p_entry_date, now(), p_description,
    p_reference_type, p_reference_id, 'posted', p_actor, p_actor, now()
  )
  returning * into v_entry;

  -- Post lines
  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_kind := v_line ->> 'account_kind';
    v_account_id := (v_line ->> 'account_id')::uuid;
    v_currency := v_line ->> 'currency';
    v_debit := coalesce((v_line ->> 'debit')::numeric, 0);
    v_credit := coalesce((v_line ->> 'credit')::numeric, 0);
    v_memo := v_line ->> 'memo';

    insert into public.gl_entry_lines (
      tenant_id, entry_id, coa_account_id, customer_account_id,
      currency, debit, credit, memo
    )
    values (
      v_tenant, v_entry.id,
      case when v_kind = 'coa' then v_account_id else null end,
      case when v_kind = 'customer' then v_account_id else null end,
      v_currency, v_debit, v_credit, v_memo
    );

    if v_kind = 'customer' then
      update public.accounts
      set ledger_balance = ledger_balance - v_debit + v_credit,
          available_balance = available_balance - v_debit + v_credit,
          updated_at = now()
      where id = v_account_id;
    else
      select normal_side into v_normal_side
      from public.coa_accounts where id = v_account_id;

      insert into public.balances (tenant_id, coa_account_id, currency)
      values (v_tenant, v_account_id, v_currency)
      on conflict (coa_account_id, currency) do nothing;

      update public.balances
      set ledger_balance = ledger_balance +
            case when v_normal_side = 'debit' then v_debit - v_credit
                 else v_credit - v_debit end,
          available_balance = available_balance +
            case when v_normal_side = 'debit' then v_debit - v_credit
                 else v_credit - v_debit end,
          last_transaction_at = now(),
          updated_at = now()
      where coa_account_id = v_account_id and currency = v_currency;
    end if;
  end loop;

  return v_entry;
end;
$$;

-- ------------------------------------------------------------
-- ledger_snapshot: chart of accounts with live balances
-- (customer-deposit COA balances = base + sum of linked customer accounts)
-- ------------------------------------------------------------
create or replace function public.ledger_snapshot()
returns table (
  code text,
  name text,
  category text,
  normal_side text,
  currency char(3),
  balance numeric(20,2)
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.code,
    c.name,
    c.category,
    c.normal_side,
    coalesce(b.currency, t.base_currency) as currency,
    coalesce(b.ledger_balance, 0) +
      coalesce((
        select sum(a.ledger_balance)
        from public.accounts a
        where a.coa_account_id = c.id
          and a.currency = coalesce(b.currency, t.base_currency)
          and a.status <> 'closed'
      ), 0) as balance
  from public.coa_accounts c
  cross join public.tenants t
  left join public.balances b on b.coa_account_id = c.id
  where c.tenant_id = public.current_tenant_id()
    and t.id = public.current_tenant_id()
  order by c.code
$$;

grant execute on function public.post_journal(text, jsonb, text, text, timestamptz, uuid, uuid) to authenticated;
grant execute on function public.open_account(text, uuid, uuid, char, text) to authenticated;
grant execute on function public.ledger_snapshot() to authenticated;
grant execute on function public.current_tenant_id() to authenticated, anon;
grant execute on function public.is_staff() to authenticated, anon;
grant execute on function public.has_role(text) to authenticated, anon;
grant execute on function public.is_customer() to authenticated, anon;

create trigger accounts_touch before update on public.accounts
  for each row execute function public.touch_updated_at();

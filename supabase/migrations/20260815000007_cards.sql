-- ============================================================
-- Capitech Bank — 0007: Virtual cards + card transactions
-- ============================================================

-- ------------------------------------------------------------
-- cards: tokenised virtual cards (PAN never stored — last4 only)
-- ------------------------------------------------------------
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  account_id uuid not null references public.accounts(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  brand text not null default 'visa' check (brand in ('visa', 'mastercard')),
  last4 text not null check (last4 ~ '^\d{4}$'),
  token text not null, -- payment token reference (sandbox: opaque string)
  exp_month integer not null check (exp_month between 1 and 12),
  exp_year integer not null,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'frozen', 'expired', 'closed')),
  name_on_card text,
  daily_limit numeric(20,2),
  monthly_limit numeric(20,2),
  online_enabled boolean not null default true,
  atm_enabled boolean not null default false,
  contactless_enabled boolean not null default true,
  frozen boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cards_account_idx on public.cards (account_id);
create index cards_customer_idx on public.cards (customer_id);

-- ------------------------------------------------------------
-- card_transactions: simulated authorisation / capture / settlement
-- ------------------------------------------------------------
create table public.card_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  card_id uuid not null references public.cards(id) on delete restrict,
  tx_type text not null default 'card_purchase' check (tx_type in ('card_purchase', 'card_refund')),
  amount numeric(20,2) not null,
  currency char(3) not null,
  merchant_name text,
  merchant_category text,
  mcc text, -- merchant category code (ISO 18245)
  country char(2),
  status text not null default 'settled' check (status in ('authorized', 'captured', 'settled', 'refunded', 'declined')),
  declined_reason text,
  created_at timestamptz not null default now()
);

create index card_tx_card_idx on public.card_transactions (card_id);

-- ------------------------------------------------------------
-- Simulated card purchase: posts to ledger when settled
-- ------------------------------------------------------------
create or replace function public.simulate_card_purchase(
  p_card_id uuid,
  p_amount numeric(20,2),
  p_currency char(3),
  p_merchant_name text default 'Sandbox Merchant',
  p_merchant_category text default 'Retail',
  p_mcc text default '5999',
  p_country char(2) default 'AE'
)
returns public.card_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_card public.cards%rowtype;
  v_tx public.card_transactions;
  v_fee_income uuid;
begin
  select * into v_card from public.cards where id = p_card_id;
  if v_card is null then
    raise exception 'Card not found';
  end if;
  if v_card.frozen or v_card.status <> 'active' then
    insert into public.card_transactions (
      tenant_id, card_id, amount, currency, merchant_name, merchant_category, mcc, country, status, declined_reason
    ) values (v_tenant, p_card_id, p_amount, p_currency, p_merchant_name, p_merchant_category, p_mcc, p_country, 'declined', 'Card is not active')
    returning * into v_tx;
    return v_tx;
  end if;
  if v_card.daily_limit is not null and p_amount > v_card.daily_limit then
    insert into public.card_transactions (
      tenant_id, card_id, amount, currency, merchant_name, merchant_category, mcc, country, status, declined_reason
    ) values (v_tenant, p_card_id, p_amount, p_currency, p_merchant_name, p_merchant_category, p_mcc, p_country, 'declined', 'Daily limit exceeded')
    returning * into v_tx;
    return v_tx;
  end if;

  -- post to ledger: debit customer account (linked to card), credit fee income & interchange
  select c.id into v_fee_income from public.coa_accounts where tenant_id = v_tenant and code = '4300';

  perform public.post_journal(
    'Card purchase — ' || p_merchant_name,
    jsonb_build_array(
      jsonb_build_object('account_kind', 'customer', 'account_id', v_card.account_id, 'currency', p_currency, 'debit', p_amount, 'credit', 0, 'memo', p_merchant_name),
      jsonb_build_object('account_kind', 'coa', 'account_id', v_fee_income, 'currency', p_currency, 'debit', 0, 'credit', p_amount, 'memo', 'Interchange income')
    ),
    'card_transaction', p_card_id::text,
    now(), null, auth.uid()
  );

  insert into public.card_transactions (
    tenant_id, card_id, tx_type, amount, currency, merchant_name, merchant_category, mcc, country, status
  ) values (
    v_tenant, p_card_id, 'card_purchase', p_amount, p_currency, p_merchant_name, p_merchant_category, p_mcc, p_country, 'settled'
  )
  returning * into v_tx;

  return v_tx;
end;
$$;

grant execute on function public.simulate_card_purchase(uuid, numeric, char, text, text, text, char) to authenticated;

create trigger cards_touch before update on public.cards
  for each row execute function public.touch_updated_at();

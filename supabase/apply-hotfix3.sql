-- ============================================================
-- Capitech Bank — HOTFIX 3 (single paste)
-- 1) execute_payment: v_fee_lines jsonb -> uuid (fixes transfer approval)
-- 2) execute_crypto_order: extensions.gen_random_bytes (fixes crypto buy)
-- Paste into: Supabase Dashboard -> SQL Editor -> Run
-- ============================================================

---- 1) recreate execute_payment ----
create or replace function public.execute_payment(
  p_order_id uuid,
  p_actor uuid default auth.uid(),
  p_approve boolean default true
)
returns public.payment_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_order public.payment_orders%rowtype;
  v_from public.accounts%rowtype;
  v_to public.accounts%rowtype;
  v_nostro uuid;
  v_lines jsonb;
  v_fee_lines uuid;
  v_fee_amount numeric(20,2);
  v_dest_account uuid;
begin
  if v_tenant is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_order from public.payment_orders
  where id = p_order_id and tenant_id = v_tenant;
  if v_order is null then
    raise exception 'Order not found';
  end if;
  if v_order.status <> 'pending' then
    raise exception 'Order is not pending (status: %)', v_order.status;
  end if;

  -- maker–checker: creator cannot approve their own payment
  if p_approve and v_order.created_by = p_actor then
    raise exception 'Maker–checker: a payment cannot be approved by its creator';
  end if;

  -- locate the nostro (settlement) account for the currency
  select c.id into v_nostro
  from public.coa_accounts c
  where c.tenant_id = v_tenant and c.code = '1100';

  if v_order.tx_type in ('internal_transfer', 'own_transfer') then
    -- internal: debit source, credit destination (both customer accounts)
    select * into v_from from public.accounts where id = v_order.from_account_id;
    if v_from is null then
      raise exception 'Source account not found';
    end if;
    select * into v_to from public.accounts where id = v_order.to_account_id;
    if v_to is null then
      -- resolve by account_no
      select * into v_to from public.accounts
      where account_no = coalesce(nullif(v_order.to_iban, ''), '')
         or iban = coalesce(nullif(v_order.to_iban, ''), '');
      if v_to is null then
        raise exception 'Destination account not found: %', v_order.to_iban;
      end if;
    end if;

    v_lines := jsonb_build_array(
      jsonb_build_object('account_kind', 'customer', 'account_id', v_order.from_account_id, 'currency', v_order.currency, 'debit', v_order.amount, 'credit', 0, 'memo', v_order.narration),
      jsonb_build_object('account_kind', 'customer', 'account_id', v_to.id, 'currency', v_order.currency, 'debit', 0, 'credit', v_order.amount, 'memo', v_order.narration)
    );

    -- fee: 0.5% capped at 20 units, charged to sender, credited to Fee Income
    v_fee_amount := least(greatest(v_order.amount * 0.005, 0.50), 20.00);
    select id into v_fee_lines from public.coa_accounts where tenant_id = v_tenant and code = '4000';
    v_lines := v_lines ||
      jsonb_build_array(
        jsonb_build_object('account_kind', 'customer', 'account_id', v_order.from_account_id, 'currency', v_order.currency, 'debit', v_fee_amount, 'credit', 0, 'memo', 'Transfer fee'),
        jsonb_build_object('account_kind', 'coa', 'account_id', v_fee_lines, 'currency', v_order.currency, 'debit', 0, 'credit', v_fee_amount, 'memo', 'Transfer fee')
      );

    perform public.post_journal(
      'Payment ' || v_order.order_no || ' — ' || coalesce(v_order.reference, 'transfer'),
      v_lines,
      'payment_order', v_order.order_no::text,
      now(), null, p_actor
    );

  elsif v_order.tx_type = 'deposit' then
    -- sandbox top-up: debit nostro, credit customer account
    select * into v_from from public.accounts where id = v_order.from_account_id;
    if v_from is null then
      raise exception 'Destination account not found';
    end if;
    v_lines := jsonb_build_array(
      jsonb_build_object('account_kind', 'coa', 'account_id', v_nostro, 'currency', v_order.currency, 'debit', v_order.amount, 'credit', 0, 'memo', 'Sandbox deposit in'),
      jsonb_build_object('account_kind', 'customer', 'account_id', v_from.id, 'currency', v_order.currency, 'debit', 0, 'credit', v_order.amount, 'memo', 'Deposit')
    );
    perform public.post_journal(
      'Deposit ' || v_order.order_no,
      v_lines,
      'payment_order', v_order.order_no::text,
      now(), null, p_actor
    );

  elsif v_order.tx_type = 'withdrawal' then
    -- sandbox cash-out: debit customer, credit nostro
    select * into v_from from public.accounts where id = v_order.from_account_id;
    if v_from is null then
      raise exception 'Source account not found';
    end if;
    v_lines := jsonb_build_array(
      jsonb_build_object('account_kind', 'customer', 'account_id', v_from.id, 'currency', v_order.currency, 'debit', v_order.amount, 'credit', 0, 'memo', 'Withdrawal'),
      jsonb_build_object('account_kind', 'coa', 'account_id', v_nostro, 'currency', v_order.currency, 'debit', 0, 'credit', v_order.amount, 'memo', 'Sandbox withdrawal out')
    );
    perform public.post_journal(
      'Withdrawal ' || v_order.order_no,
      v_lines,
      'payment_order', v_order.order_no::text,
      now(), null, p_actor
    );
  else
    raise exception 'Execution for tx_type % not implemented yet', v_order.tx_type;
  end if;

  update public.payment_orders
  set status = 'posted',
      approved_by = case when p_approve then p_actor else approved_by end,
      approved_at = case when p_approve then now() else approved_at end,
      executed_at = now(),
      fee_amount = case when v_order.tx_type in ('internal_transfer', 'own_transfer') then v_fee_amount else fee_amount end,
      fee_currency = case when v_order.tx_type in ('internal_transfer', 'own_transfer') then v_order.currency else fee_currency end,
      updated_at = now()
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

---- 2) recreate execute_crypto_order ----
create or replace function public.execute_crypto_order(
  p_account_id uuid,
  p_side text,
  p_asset text,
  p_amount_fiat numeric(20,2),
  p_price numeric(24,12)
)
returns public.crypto_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_account public.accounts%rowtype;
  v_amount_asset numeric(36,18);
  v_coa_crypto uuid;
  v_order public.crypto_orders;
  v_wallet public.crypto_wallets%rowtype;
begin
  if v_tenant is null then
    raise exception 'Not authenticated';
  end if;
  if p_side not in ('buy', 'sell') then
    raise exception 'side must be buy or sell';
  end if;
  if p_amount_fiat <= 0 or p_price <= 0 then
    raise exception 'amount and price must be positive';
  end if;

  select * into v_account from public.accounts
  where id = p_account_id and tenant_id = v_tenant;
  if v_account is null then
    raise exception 'Account not found';
  end if;

  v_amount_asset := round(p_amount_fiat / p_price, 8);

  select id into v_coa_crypto from public.coa_accounts
  where tenant_id = v_tenant and code = '2300';

  -- ledger: buy = debit fiat / credit crypto liability; sell = reverse
  perform public.post_journal(
    case when p_side = 'buy' then 'Crypto purchase ' else 'Crypto sale ' end || p_asset,
    jsonb_build_array(
      jsonb_build_object('account_kind', 'customer', 'account_id', p_account_id,
                         'currency', v_account.currency,
                         'debit', case when p_side = 'buy' then p_amount_fiat else 0 end,
                         'credit', case when p_side = 'sell' then p_amount_fiat else 0 end,
                         'memo', p_asset),
      jsonb_build_object('account_kind', 'coa', 'account_id', v_coa_crypto,
                         'currency', v_account.currency,
                         'debit', case when p_side = 'sell' then p_amount_fiat else 0 end,
                         'credit', case when p_side = 'buy' then p_amount_fiat else 0 end,
                         'memo', p_asset)
    ),
    'crypto_order', null,
    now(), v_tenant, auth.uid()
  );

  -- wallet balance update
  select * into v_wallet from public.crypto_wallets
  where account_id = p_account_id and asset = upper(p_asset);
  if v_wallet is null then
    if p_side = 'sell' then
      raise exception 'No wallet for % — nothing to sell', p_asset;
    end if;
    insert into public.crypto_wallets (tenant_id, account_id, asset, balance, address)
    values (v_tenant, p_account_id, upper(p_asset), 0, '0x' || encode(extensions.gen_random_bytes(20), 'hex'));
    select * into v_wallet from public.crypto_wallets
    where account_id = p_account_id and asset = upper(p_asset);
  end if;

  if p_side = 'sell' and v_wallet.balance < v_amount_asset then
    raise exception 'Insufficient % balance (available % < %)', p_asset, v_wallet.balance, v_amount_asset;
  end if;

  update public.crypto_wallets
  set balance = balance + case when p_side = 'buy' then v_amount_asset else -v_amount_asset end,
      updated_at = now()
  where id = v_wallet.id;

  insert into public.crypto_orders (
    tenant_id, account_id, order_type, asset, side,
    amount_fiat, amount_asset, price, status
  ) values (
    v_tenant, p_account_id, 'market', upper(p_asset), p_side,
    p_amount_fiat, v_amount_asset, p_price, 'filled'
  )
  returning * into v_order;

  return v_order;
end;
$$;

grant execute on function public.execute_payment(uuid, uuid, boolean) to authenticated;
grant execute on function public.execute_crypto_order(uuid, text, text, numeric, numeric) to authenticated;

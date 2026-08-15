-- ============================================================
-- Capitech Bank — 0013 HOTFIX: execute_crypto_order gen_random_bytes
-- Paste into: Supabase Dashboard → SQL Editor → Run
-- ============================================================

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


grant execute on function public.execute_crypto_order(uuid, text, text, numeric, numeric) to authenticated;

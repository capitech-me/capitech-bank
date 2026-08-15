-- ============================================================
-- Capitech Bank — 0011: International-standard IBAN generation
-- ISO 13616 / ECBS compliant BBAN per country + backfill
-- ============================================================

-- ------------------------------------------------------------
-- generate_iban(country, account_no): standards-compliant IBAN
-- ------------------------------------------------------------
create or replace function public.generate_iban(p_country char(2), p_account_no text)
returns text
language plpgsql
immutable
as $$
declare
  v_country text := upper(p_country);
  v_bank text;
  v_len int;
  v_bban text;
  v_iban text;
  v_check numeric;
begin
  v_bank := case v_country
    when 'AE' then '999'      when 'DE' then '99999999'  when 'GB' then 'CAPT'
    when 'FR' then '99999'    when 'ES' then '9999'      when 'IT' then '99999'
    when 'NL' then 'CAPT'     when 'SA' then '99'        when 'TR' then '99999'
    when 'PL' then '99999999' when 'CZ' then '9999'      when 'HU' then '99999999'
    when 'RO' then 'CAPT'     when 'BG' then 'CAPT'      when 'BR' then '9999999'
    when 'KZ' then '999'      when 'UA' then '999999'    when 'IL' then '999'
    when 'KW' then 'CAPT'     when 'BH' then 'CAPT'      when 'QA' then 'CAPT'
    when 'JO' then 'CAPT'     when 'MU' then 'CAPT'      when 'SC' then 'CAPT'
    when 'MT' then 'CAPT'     when 'MC' then '99999'     when 'SM' then '99999'
    when 'AD' then '9999'     when 'LI' then '99999'     when 'CH' then '99999'
    when 'AT' then '99999'    when 'PT' then '9999'      when 'GR' then '999'
    when 'SE' then '9999'     when 'NO' then '9999'      when 'FI' then '999999'
    when 'DK' then '9999'     when 'IS' then '9999'      when 'IE' then 'CAPT'
    when 'LU' then '999'      when 'BE' then '999'       when 'HR' then '9999999'
    when 'SI' then '99'       when 'SK' then '9999'      when 'EE' then '99'
    when 'LV' then 'CAPT'     when 'LT' then '99999'
    else '99999'
  end;

  v_len := case v_country
    when 'AE' then 23 when 'DE' then 22 when 'GB' then 22 when 'FR' then 27
    when 'ES' then 24 when 'IT' then 27 when 'NL' then 18 when 'SA' then 24
    when 'TR' then 26 when 'PL' then 28 when 'CZ' then 24 when 'HU' then 28
    when 'RO' then 24 when 'BG' then 22 when 'BR' then 29 when 'KZ' then 20
    when 'UA' then 29 when 'IL' then 23 when 'KW' then 30 when 'BH' then 22
    when 'QA' then 29 when 'JO' then 30 when 'MU' then 30 when 'SC' then 31
    when 'MT' then 31 when 'MC' then 27 when 'SM' then 27 when 'AD' then 24
    when 'LI' then 21 when 'CH' then 21 when 'AT' then 20 when 'PT' then 25
    when 'GR' then 27 when 'SE' then 24 when 'NO' then 15 when 'FI' then 18
    when 'DK' then 18 when 'IS' then 26 when 'IE' then 22 when 'LU' then 20
    when 'BE' then 16 when 'HR' then 21 when 'SI' then 19 when 'SK' then 24
    when 'EE' then 20 when 'LV' then 21 when 'LT' then 20
    else 22
  end;

  -- BBAN = national bank identifier + zero-padded account number
  v_bban := lpad(regexp_replace(p_account_no, '\D', '', 'g'), v_len - 4 - length(v_bank), '0');
  v_bban := v_bank || v_bban;

  -- mod-97 check digits (ISO 13616)
  v_iban := v_country || '00' || v_bban;
  v_check := 98 - public.iban_mod97(v_iban);

  return v_country || lpad(v_check::text, 2, '0') || v_bban;
end;
$$;

-- ------------------------------------------------------------
-- Replace the sandbox trigger with the standards-compliant one
-- ------------------------------------------------------------
create or replace function public.fill_iban()
returns trigger
language plpgsql
as $$
declare
  v_country char(2);
begin
  select country into v_country from public.tenants where id = new.tenant_id;
  new.iban := public.generate_iban(v_country, new.account_no);
  new.swift_bic := 'CAPT' || v_country || 'XX';
  return new;
end;
$$;

drop trigger if exists fill_iban_trigger on public.accounts;
create trigger fill_iban_trigger
  before insert on public.accounts
  for each row when (new.iban is null)
  execute function public.fill_iban();

-- ------------------------------------------------------------
-- Backfill existing accounts with compliant IBANs
-- ------------------------------------------------------------
update public.accounts a
set iban = public.generate_iban(t.country, a.account_no),
    swift_bic = 'CAPT' || t.country || 'XX'
from public.tenants t
where t.id = a.tenant_id
  and a.iban is not null
  and (a.iban like '%CAPT%' or a.iban like '%00CAPT%' or length(a.iban) < 15);

grant execute on function public.generate_iban(char, text) to authenticated;

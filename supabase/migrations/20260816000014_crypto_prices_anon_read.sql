-- =====================================================================
-- Capitech Bank — Migration 0014: crypto_prices anonymous read (S-9)
-- /api/crypto/prices is unauthenticated: reads must work with the anon
-- client. Writes stay server-side (service-role), never via RLS.
-- =====================================================================

drop policy if exists "crypto_prices_select_anon" on public.crypto_prices;
create policy "crypto_prices_select_anon" on public.crypto_prices
  for select to anon
  using (true);

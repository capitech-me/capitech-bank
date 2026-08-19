import { NextResponse } from "next/server";
import { createAdminClient, createServerClient, withRateLimit } from "@capitech/db";
import { cookies } from "next/headers";

/**
 * GET /api/crypto/prices?assets=BTC,ETH,SOL,USDT
 * Fetches live prices from Alpha Vantage (CURRENCY_EXCHANGE_RATE) and caches
 * them in crypto_prices.
 *
 * Quota strategy (Alpha Vantage free tier ≈ 25 req/day, ~1 req / 15s):
 * - Serve cached prices IMMEDIATELY (fast + quota-friendly).
 * - Refresh ONE asset per request (round-robin via a rotating index stored in
 *   the cache's updated_at) so all assets refresh across successive page loads
 *   without ever bursting the limit.
 * - Falls back to cached / demo prices when Alpha Vantage throttles.
 *
 * Security (S-9): anonymous callers only READ cached prices. Cache writes
 * happen server-side via the service-role client only.
 */

const ALPHAVANTAGE = "https://www.alphavantage.co/query";

// Rate limit for anonymous reads (S-7).
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

// Minimum age of an asset's cache entry before we refresh it (ms).
const REFRESH_AGE_MS = 15 * 60 * 1000;

const SUPPORTED_ASSETS = ["BTC", "ETH", "SOL", "USDT", "USDC", "XRP", "BNB", "ADA", "DOT", "LTC", "DOGE", "AVAX", "LINK", "TRX", "ATOM", "NEAR", "APT", "SUI", "SHIB", "BCH", "ETC", "MKR", "AAVE", "FIL", "XLM", "ALGO", "XTZ"];

export async function GET(req: Request) {
  const limited = withRateLimit(req, RATE_LIMIT, RATE_WINDOW_MS);
  if (limited) return limited;

  const url = new URL(req.url);
  const requested = (url.searchParams.get("assets") ?? "BTC,ETH,SOL,USDT")
    .split(",")
    .map((a) => a.trim().toUpperCase())
    .filter((a) => SUPPORTED_ASSETS.includes(a));
  if (requested.length === 0) {
    return NextResponse.json({ error: "no_supported_assets" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = await createServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      try {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      } catch {
        // ignore when called from a Server Component context
      }
    },
  });

  // 1. Read cache first (always served; fast + quota friendly)
  const { data: cached, error } = await supabase
    .from("crypto_prices")
    .select("asset, price_usd, change_24h, market_cap, updated_at")
    .in("asset", requested);

  let cacheMap = new Map<string, { price_usd: string; change_24h: string; market_cap: string | null; updated_at: string }>();
  if (!error && cached) {
    for (const row of cached) {
      cacheMap.set(row.asset, row);
    }
  }

  // 2. Refresh the STALEST requested asset from Alpha Vantage (round-robin)
  const apiKey = process.env.ALPHAVANTAGE_API_KEY;
  const now = Date.now();
  const stalest = requested
    .map((a) => {
      const cachedRow = cacheMap.get(a);
      const age = cachedRow ? now - new Date(cachedRow.updated_at).getTime() : Infinity;
      return { asset: a, age };
    })
    .sort((x, y) => y.age - x.age)[0];

  if (apiKey && stalest && stalest.age > REFRESH_AGE_MS) {
    try {
      const res = await fetch(
        `${ALPHAVANTAGE}?function=CURRENCY_EXCHANGE_RATE&from_currency=${stalest.asset}&to_currency=USD&apikey=${apiKey}`,
        { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000) }
      );
      if (res.ok) {
        const data = await res.json();
        const rate = data?.["Realtime Currency Exchange Rate"];
        if (rate?.["5. Exchange Rate"]) {
          const fresh = {
            asset: stalest.asset,
            price_usd: String(rate["5. Exchange Rate"]),
            change_24h: "0",
            market_cap: null,
          };
          // Server-side cache maintenance only — never driven by client input.
          const admin = createAdminClient();
          await admin.from("crypto_prices").upsert([fresh], { onConflict: "asset" });
          cacheMap.set(stalest.asset, { ...fresh, updated_at: new Date().toISOString() });
        }
      }
    } catch {
      // throttled or unreachable — keep serving cache
    }
  }

  // 3. Build the response from cache (now possibly refreshed), fall back to demo
  const rows = requested.map((a) => {
    const cachedRow = cacheMap.get(a);
    if (cachedRow) {
      return {
        asset: a,
        price_usd: cachedRow.price_usd,
        change_24h: cachedRow.change_24h ?? "0",
        market_cap: cachedRow.market_cap,
        updated_at: cachedRow.updated_at,
      };
    }
    return {
      asset: a,
      price_usd: String({ BTC: 61240.5, ETH: 3421.18, SOL: 146.72, USDT: 1 }[a] ?? 1),
      change_24h: "0",
      market_cap: null,
      updated_at: new Date().toISOString(),
    };
  });

  return NextResponse.json({ data: rows, stale: false, fetched_at: new Date().toISOString() });
}

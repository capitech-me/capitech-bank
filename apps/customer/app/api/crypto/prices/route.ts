import { NextResponse } from "next/server";
import { createAdminClient, createServerClient, withRateLimit } from "@capitech/db";
import { cookies } from "next/headers";

/**
 * GET /api/crypto/prices?assets=BTC,ETH,SOL,USDT
 * Fetches live prices from CoinGecko and caches them in crypto_prices.
 * Falls back to the cache (with a staleness flag) when CoinGecko is unreachable.
 *
 * Security (S-9): anonymous callers can only READ cached prices. The server
 * refreshes the cache with the service-role client internally — no query
 * param or body can force a write; writes happen only from the server's own
 * CoinGecko fetch.
 */

const COINGECKO = "https://api.coingecko.com/api/v3/simple/price";

// Rate limit for anonymous reads (S-7).
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

const ASSET_TO_COINGECKO: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  USDT: "tether",
  USDC: "usd-coin",
  XRP: "ripple",
  BNB: "binancecoin",
  ADA: "cardano",
  DOT: "polkadot",
  LTC: "litecoin",
  DOGE: "dogecoin",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  MATIC: "matic-network",
  TRX: "tron",
  ATOM: "cosmos",
  NEAR: "near",
  APT: "aptos",
  ARB: "arbitrum",
  OP: "optimism",
  SUI: "sui",
  TON: "the-open-network",
  SHIB: "shiba-inu",
  PEPE: "pepe",
  BCH: "bitcoin-cash",
  ETC: "ethereum-classic",
  MKR: "maker",
  AAVE: "aave",
  GRT: "the-graph",
  FIL: "filecoin",
  XLM: "stellar",
  ALGO: "algorand",
  INJ: "injective-protocol",
  RUNE: "thorchain",
  FET: "fetch-ai",
  RNDR: "render-token",
  EGLD: "elrond-erd-2",
  XTZ: "tezos",
  SEI: "sei-network",
};

export async function GET(req: Request) {
  const limited = withRateLimit(req, RATE_LIMIT, RATE_WINDOW_MS);
  if (limited) return limited;

  const url = new URL(req.url);
  const requested = (url.searchParams.get("assets") ?? "BTC,ETH,SOL,USDT")
    .split(",")
    .map((a) => a.trim().toUpperCase())
    .filter((a) => ASSET_TO_COINGECKO[a]);
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

  // 1. Try a fresh CoinGecko fetch
  const ids = requested.map((a) => ASSET_TO_COINGECKO[a]).join(",");
  try {
    const res = await fetch(`${COINGECKO}?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      const rows: { asset: string; price_usd: string; change_24h: string; market_cap: string | null }[] = [];
      for (const asset of requested) {
        const cg = ASSET_TO_COINGECKO[asset];
        const raw = data[cg];
        if (!raw) continue;
        rows.push({
          asset,
          price_usd: String(raw.usd ?? 0),
          change_24h: String(raw.usd_24h_change ?? 0),
          market_cap: raw.usd_market_cap != null ? String(raw.usd_market_cap) : null,
        });
      }

      if (rows.length > 0) {
        // Server-side cache maintenance only — never driven by client input.
        const admin = createAdminClient();
        await admin.from("crypto_prices").upsert(rows, { onConflict: "asset" });
      }
      return NextResponse.json({ data: rows, stale: false, fetched_at: new Date().toISOString() });
    }
  } catch {
    // fall through to cache
  }

  // 2. Fallback: cached prices (read through the anon/public client)
  const { data: cached, error } = await supabase
    .from("crypto_prices")
    .select("asset, price_usd, change_24h, market_cap, updated_at")
    .in("asset", requested);
  if (error || !cached || cached.length === 0) {
    // 3. Last resort: static demo prices so the UI never breaks
    const demo = requested.map((a) => ({
      asset: a,
      price_usd: String({ BTC: 61240.5, ETH: 3421.18, SOL: 146.72, USDT: 1 }[a] ?? 1),
      change_24h: "0",
      market_cap: null,
      updated_at: new Date().toISOString(),
    }));
    return NextResponse.json({ data: demo, stale: true, source: "demo" });
  }
  return NextResponse.json({ data: cached, stale: true, source: "cache" });
}

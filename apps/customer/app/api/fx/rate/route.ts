import { NextResponse } from "next/server";
import { withRateLimit } from "@capitech/db";
import { CURRENCIES } from "@capitech/lib";

/**
 * GET /api/fx/rate?from=USD&to=EUR
 * Proxies Alpha Vantage (CURRENCY_EXCHANGE_RATE) server-side so the API key
 * never reaches the browser (same pattern as /api/crypto/prices).
 *
 * Quota strategy (Alpha Vantage free tier ≈ 25 req/day):
 * - Fetches the live rate when the API key is configured.
 * - Falls back to a small static sandbox table when the key is absent or the
 *   upstream is throttled, so the UI always has a rate to show.
 *
 * Security: IP rate-limited; currency pair validated against the ISO 4217
 * table from @capitech/lib (no arbitrary upstream probing).
 */

const ALPHAVANTAGE = "https://www.alphavantage.co/query";

// Rate limit for anonymous reads (mirrors /api/crypto/prices).
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

/** Rough mid-market snapshot (units of 1 FROM per TO), used only as fallback. */
const USD_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.9245,
  GBP: 0.7925,
  CHF: 0.8812,
  JPY: 156.34,
  CAD: 1.3715,
  AUD: 1.5318,
  NZD: 1.6722,
  SGD: 1.3442,
  HKD: 7.8121,
  CNY: 7.1268,
  INR: 83.45,
  AED: 3.6725,
  SAR: 3.75,
  QAR: 3.64,
  KWD: 0.3066,
  BHD: 0.376,
  OMR: 0.3845,
  TRY: 32.48,
  PLN: 3.9422,
  CZK: 23.21,
  SEK: 10.42,
  NOK: 10.66,
  DKK: 6.89,
  ZAR: 18.21,
  NGN: 1543.2,
  KES: 129.4,
  EGP: 48.05,
  MAD: 9.92,
  GHS: 12.9,
};

/** Cross-rate from two USD-denominated rates. */
function crossRate(from: string, to: string): number | null {
  const base = USD_RATES[from];
  const target = USD_RATES[to];
  if (!base || !target) return null;
  return target / base;
}

export async function GET(req: Request) {
  const limited = withRateLimit(req, RATE_LIMIT, RATE_WINDOW_MS);
  if (limited) return limited;

  const url = new URL(req.url);
  const from = (url.searchParams.get("from") ?? "").trim().toUpperCase();
  const to = (url.searchParams.get("to") ?? "").trim().toUpperCase();

  if (!from || !to || !CURRENCIES[from] || !CURRENCIES[to]) {
    return NextResponse.json({ error: "unsupported_currency_pair" }, { status: 400 });
  }
  if (from === to) {
    return NextResponse.json({ from, to, rate: 1, fetched_at: new Date().toISOString() });
  }

  const apiKey = process.env.ALPHAVANTAGE_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch(
        `${ALPHAVANTAGE}?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${apiKey}`,
        { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000) }
      );
      if (res.ok) {
        const data = await res.json();
        const rate = data?.["Realtime Currency Exchange Rate"];
        const value = rate?.["5. Exchange Rate"];
        if (value && Number(value) > 0) {
          return NextResponse.json({
            from,
            to,
            rate: Number(value),
            bid: rate?.["8. Bid Price"] ? Number(rate["8. Bid Price"]) : null,
            ask: rate?.["9. Ask Price"] ? Number(rate["9. Ask Price"]) : null,
            demo: false,
            fetched_at: new Date().toISOString(),
          });
        }
        // Throttled by Alpha Vantage (free tier ~25 req/day).
        if (typeof data?.["Information"] === "string") {
          const demo = crossRate(from, to);
          if (demo) {
            return NextResponse.json({
              from,
              to,
              rate: demo,
              demo: true,
              note: "upstream_throttled",
              fetched_at: new Date().toISOString(),
            });
          }
          return NextResponse.json({ error: "upstream_throttled" }, { status: 503 });
        }
      }
    } catch {
      // network error — fall through to demo rate
    }
  }

  const demo = crossRate(from, to);
  if (demo) {
    return NextResponse.json({
      from,
      to,
      rate: demo,
      demo: true,
      fetched_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({ error: "rate_unavailable" }, { status: 503 });
}

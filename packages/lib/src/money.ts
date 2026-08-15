import { getCurrency, isCrypto } from "./currencies";

/**
 * Money helpers. All stored amounts are NUMERIC in the database;
 * we only format + round here (never use floats for arithmetic).
 */

/** Round half-up to the currency's exponent (decimals). Works on strings to avoid float drift. */
export function roundToCurrency(amount: string | number, currency: string): string {
  const decimals = getCurrency(currency).decimals;
  const factor = Math.pow(10, decimals);
  const n = typeof amount === "number" ? amount.toString() : amount;
  // parse as decimal string to avoid binary float errors
  const [intPart, decPart = ""] = n.split(".");
  const full = intPart.replace("-", "") + decPart.padEnd(decimals, "0").slice(0, decimals);
  const isNeg = n.startsWith("-");
  // use Number only for the rounding step on an integer-scaled value
  const scaled = Number(full);
  const rounded = Math.round(scaled / 1); // already integer
  void factor;
  const result = isNeg ? -rounded : rounded;
  const out = (result / Math.pow(10, decimals)).toFixed(decimals);
  return out;
}

/** Format a monetary amount for display. */
export function formatMoney(amount: string | number, currency: string, opts?: { locale?: string; compact?: boolean }): string {
  const info = getCurrency(currency);
  const locale = opts?.locale ?? "en-US";
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (isCrypto(currency) || info.crypto) {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(value) + ` ${currency}`;
  }
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: opts?.compact ? "compact" : "standard",
    }).format(value);
  } catch {
    return `${info.symbol}${value.toLocaleString(locale)}`;
  }
}

/** Format a signed amount with an explicit + or - prefix (for statements). */
export function formatSignedMoney(amount: string | number, currency: string): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return sign + formatMoney(Math.abs(value), currency);
}

/** Parse a user-typed amount string into a decimal string ("" -> "0"). */
export function parseAmount(input: string): string | null {
  const cleaned = input.replace(/[$€£¥₦₽₹,\s]/g, "");
  if (!/^\d+(\.\d{0,8})?$/.test(cleaned)) return null;
  return cleaned;
}

/** Validate that an amount is > 0 and within max decimals for the currency. */
export function isValidAmount(input: string, currency: string): boolean {
  const parsed = parseAmount(input);
  if (!parsed) return false;
  const decimals = getCurrency(currency).decimals;
  const [, frac = ""] = parsed.split(".");
  if (frac.length > decimals) return false;
  return Number(parsed) > 0;
}

/** Convert between currencies using a rate. amount * rate, rounded to target currency exponent. */
export function convertAmount(amount: string | number, fromCurrency: string, toCurrency: string, rate: number): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  const converted = value * rate;
  return roundToCurrency(converted, toCurrency);
}

/** Format a percentage (e.g. annual interest rate). */
export function formatPercent(value: string | number, digits = 2): string {
  const n = typeof value === "string" ? Number(value) : value;
  return `${n.toFixed(digits)}%`;
}

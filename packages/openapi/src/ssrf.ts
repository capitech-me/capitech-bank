/**
 * SSRF guard for outbound webhook URLs (S-10).
 * Validates that a webhook URL is https:// and that every DNS record
 * resolves to a public IP — rejecting private / loopback / link-local /
 * metadata ranges. Dependency-free (node built-ins only).
 */

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_IPV4_PREFIXES: Array<{ name: string; test: (a: number, b: number, c: number, d: number) => boolean }> = [
  { name: "0.0.0.0/8", test: (a) => a === 0 },
  { name: "10.0.0.0/8", test: (a) => a === 10 },
  { name: "100.64.0.0/10", test: (a, b) => a === 100 && b >= 64 && b <= 127 },
  { name: "127.0.0.0/8", test: (a) => a === 127 },
  { name: "169.254.0.0/16", test: (a, b) => a === 169 && b === 254 },
  { name: "172.16.0.0/12", test: (a, b) => a === 172 && b >= 16 && b <= 31 },
  { name: "192.0.0.0/24", test: (a, b, c) => a === 192 && b === 0 && c === 0 },
  { name: "192.168.0.0/16", test: (a, b) => a === 192 && b === 168 },
  { name: "198.18.0.0/15", test: (a, b) => a === 198 && (b === 18 || b === 19) },
];

function isPrivateIPv4(address: string): boolean {
  const parts = address.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    // Unparseable → treat as unsafe.
    return true;
  }
  const [a, b, c, d] = parts;
  return BLOCKED_IPV4_PREFIXES.some((r) => r.test(a, b, c, d));
}

function isPrivateIPv6(address: string): boolean {
  const lower = address.toLowerCase();
  // Loopback ::1 and unspecified ::
  if (lower === "::1" || lower === "::") return true;
  // Unique local fc00::/7
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  // Link-local fe80::/10 (fe80..febf)
  if (
    lower.startsWith("fe8") ||
    lower.startsWith("fe9") ||
    lower.startsWith("fea") ||
    lower.startsWith("feb")
  ) {
    return true;
  }
  // IPv4-mapped ::ffff:0:0/96 → evaluate the embedded IPv4.
  if (lower.startsWith("::ffff:")) {
    const v4 = lower.slice("::ffff:".length);
    if (v4.includes(".")) {
      return isPrivateIPv4(v4);
    }
    // Hex form, e.g. ::ffff:c0a8:0101
    const groups = v4.split(":");
    if (groups.length === 2 && groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) {
      const hex = groups[0].padStart(4, "0") + groups[1].padStart(4, "0");
      const bytes = [0, 1, 2, 3].map((i) => parseInt(hex.slice(i * 2, i * 2 + 2), 16));
      if (!bytes.some(Number.isNaN)) {
        return isPrivateIPv4(bytes.join("."));
      }
    }
  }
  return false;
}

/**
 * Return true only when `url` is https:// and every resolved A/AAAA record
 * is a public address. Any private / loopback / link-local / metadata record,
 * any parse error, or any DNS failure rejects the URL.
 */
export async function isSafeWebhookUrl(url: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;

  const hostname = parsed.hostname;
  if (!hostname) return false;

  // Literal IP hostnames can be checked without a DNS lookup.
  const ipKind = isIP(hostname);
  if (ipKind === 4) return !isPrivateIPv4(hostname);
  if (ipKind === 6) return !isPrivateIPv6(hostname);

  let records: { address: string; family: number }[];
  try {
    records = await lookup(hostname, { all: true });
  } catch {
    // DNS failure → deny by default.
    return false;
  }
  if (records.length === 0) return false;

  for (const record of records) {
    if (record.family === 4) {
      if (isPrivateIPv4(record.address)) return false;
    } else {
      if (isPrivateIPv6(record.address)) return false;
    }
  }
  return true;
}

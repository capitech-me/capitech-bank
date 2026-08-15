/** Formatting helpers: dates, masking, percentages, references. */

export function formatDate(date: string | Date, locale = "en-GB"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export function formatDateTime(date: string | Date, locale = "en-GB"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatRelativeTime(date: string | Date, now = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = now.getTime() - d.getTime();
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

/** Mask a card number -> •••• •••• •••• 1234 */
export function maskCard(cardNumber: string): string {
  const clean = cardNumber.replace(/\D/g, "");
  if (clean.length < 8) return clean;
  const last4 = clean.slice(-4);
  return `•••• •••• •••• ${last4}`;
}

/** Mask an arbitrary value keeping only the last N chars. */
export function maskLast(value: string, keep = 4): string {
  if (value.length <= keep) return value;
  return "•".repeat(value.length - keep) + value.slice(-keep);
}

/** Format a card expiry month/year pair. */
export function formatCardExpiry(expMonth: number, expYear: number): string {
  return `${expMonth.toString().padStart(2, "0")}/${expYear.toString().slice(-2)}`;
}

/** Generate a human-friendly reference like CAP-20260815-7F3K2. */
export function generateReference(prefix = "CAP"): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${date}-${rand}`;
}

/** Generate a deterministic-looking account number: 12 digits. */
export function generateAccountNumber(): string {
  const rand = Math.floor(Math.random() * 1e12);
  return rand.toString().padStart(12, "0");
}

/** Truncate a string in the middle. */
export function truncateMiddle(value: string, max = 24): string {
  if (value.length <= max) return value;
  const half = Math.floor((max - 3) / 2);
  return `${value.slice(0, half)}...${value.slice(-half)}`;
}

/** Title-case a snake_case or kebab-case label. */
export function humanize(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

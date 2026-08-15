/**
 * IBAN utilities — sandbox implementation following the ECBS/ISO 13616 standard.
 * Generates structurally valid IBANs with correct mod-97 check digits.
 */

export const BANK_BIC_PREFIX = "CAPT"; // sandbox BIC prefix
export const BANK_CODE = "CAPT"; // sandbox bank code used inside BBAN

/** Country → sandbox bank identifier matching the country's BBAN structure. */
const BANK_CODES: Record<string, string> = {
  AE: "999", // 3-digit bank code
  DE: "99999999", // 8-digit BLZ
  GB: "CAPT", // 4-char sort code
  FR: "99999", // 5-digit bank
  ES: "9999", // 4-digit
  IT: "99999", // 5-digit
  NL: "CAPT", // 4-char
  SA: "99", // 2-digit
  TR: "99999", // 5-digit
  PL: "99999999", // 8-digit
  CZ: "9999", // 4-digit
  HU: "99999999", // 8-digit
  RO: "CAPT", // 4-char
  BG: "CAPT", // 4-char
  BR: "9999999", // 7-digit
  KZ: "999", // 3-digit
  UA: "999999", // 6-digit
  IL: "999", // 3-digit
  KW: "CAPT", // 4-char
  BH: "CAPT", // 4-char
  QA: "CAPT", // 4-char
  JO: "CAPT", // 4-char
  MU: "CAPT", // 4-char
  SC: "CAPT", // 4-char
  MC: "99999", // 5-digit
  SM: "99999", // 5-digit
  AD: "9999", // 4-digit
  LI: "99999", // 5-digit
  CH: "99999", // 5-digit
  AT: "99999", // 5-digit
  PT: "9999", // 4-digit
  GR: "999", // 3-digit
  SE: "9999", // 4-digit
  NO: "9999", // 4-digit
  FI: "999999", // 6-digit
  DK: "9999", // 4-digit
  IS: "9999", // 4-digit
  IE: "CAPT", // 4-char
  LU: "999", // 3-digit
  BE: "999", // 3-digit
  HR: "9999999", // 7-digit
  SI: "99", // 2-digit
  SK: "9999", // 4-digit
  EE: "99", // 2-digit
  LV: "CAPT", // 4-char
  LT: "99999", // 5-digit
  MT: "CAPT", // 4-char
};

interface IbanSpec {
  length: number;
  bban: string; // regex of BBAN structure
}

const IBAN_SPECS: Record<string, IbanSpec> = {
  DE: { length: 22, bban: "\\d{18}" },
  GB: { length: 22, bban: "[A-Z]{4}\\d{14}" },
  FR: { length: 27, bban: "\\d{10}[A-Z0-9]{11}\\d{2}" },
  ES: { length: 24, bban: "\\d{20}" },
  IT: { length: 27, bban: "[A-Z]\\d{10}[A-Z0-9]{12}" },
  NL: { length: 18, bban: "[A-Z]{4}\\d{10}" },
  BE: { length: 16, bban: "\\d{12}" },
  PT: { length: 25, bban: "\\d{21}" },
  SE: { length: 24, bban: "\\d{20}" },
  AT: { length: 20, bban: "\\d{16}" },
  CH: { length: 21, bban: "\\d{5}[A-Z0-9]{12}" },
  DK: { length: 18, bban: "\\d{14}" },
  FI: { length: 18, bban: "\\d{14}" },
  NO: { length: 15, bban: "\\d{11}" },
  IE: { length: 22, bban: "[A-Z]{4}\\d{14}" },
  LU: { length: 20, bban: "\\d{3}[A-Z0-9]{13}" },
  MT: { length: 31, bban: "[A-Z]{4}\\d{5}[A-Z0-9]{18}" },
  CY: { length: 28, bban: "\\d{8}[A-Z0-9]{16}" },
  GR: { length: 27, bban: "\\d{7}[A-Z0-9]{16}" },
  SK: { length: 24, bban: "\\d{20}" },
  SI: { length: 19, bban: "\\d{15}" },
  EE: { length: 20, bban: "\\d{16}" },
  LV: { length: 21, bban: "[A-Z]{4}\\d{13}" },
  LT: { length: 20, bban: "\\d{16}" },
  PL: { length: 28, bban: "\\d{24}" },
  CZ: { length: 24, bban: "\\d{20}" },
  HU: { length: 28, bban: "\\d{24}" },
  RO: { length: 24, bban: "[A-Z]{4}\\d{16}" },
  BG: { length: 22, bban: "[A-Z]{4}\\d{6}[A-Z0-9]{8}" },
  HR: { length: 21, bban: "\\d{17}" },
  AE: { length: 23, bban: "\\d{3}\\d{16}" },
  SA: { length: 24, bban: "\\d{2}[A-Z0-9]{18}" },
  TR: { length: 26, bban: "\\d{5}[A-Z0-9]{17}" },
  IL: { length: 23, bban: "\\d{19}" },
  KW: { length: 30, bban: "[A-Z]{4}[A-Z0-9]{22}" },
  BH: { length: 22, bban: "[A-Z]{4}[A-Z0-9]{14}" },
  QA: { length: 29, bban: "[A-Z]{4}[A-Z0-9]{21}" },
  OM: { length: 23, bban: "\\d{3}[A-Z0-9]{16}" },
  JO: { length: 30, bban: "[A-Z]{4}\\d{4}[A-Z0-9]{18}" },
  MU: { length: 30, bban: "[A-Z]{4}\\d{19}[A-Z]{3}" },
  SC: { length: 31, bban: "[A-Z]{4}\\d{20}[A-Z]{3}" },
  CR: { length: 22, bban: "\\d{18}" },
  DO: { length: 28, bban: "[A-Z]{4}\\d{20}" },
  GT: { length: 28, bban: "[A-Z]{4}\\d{20}" },
  SV: { length: 28, bban: "[A-Z]{4}\\d{20}" },
  BR: { length: 29, bban: "\\d{23}[A-Z]{1}\\d{1}" },
  KZ: { length: 20, bban: "\\d{3}[A-Z0-9]{13}" },
  UA: { length: 29, bban: "\\d{6}[A-Z0-9]{19}" },
  BY: { length: 28, bban: "[A-Z]{4}\\d{4}[A-Z0-9]{16}" },
  MD: { length: 24, bban: "[A-Z]{2}\\d{18}" },
  AL: { length: 28, bban: "\\d{8}[A-Z0-9]{16}" },
  MK: { length: 19, bban: "\\d{3}[A-Z0-9]{10}\\d{2}" },
  BA: { length: 20, bban: "\\d{16}" },
  ME: { length: 22, bban: "\\d{18}" },
  RS: { length: 22, bban: "\\d{18}" },
  XK: { length: 20, bban: "\\d{16}" },
  VG: { length: 24, bban: "[A-Z]{4}\\d{16}" },
  GI: { length: 23, bban: "[A-Z]{4}[A-Z0-9]{15}" },
  MC: { length: 27, bban: "\\d{10}[A-Z0-9]{11}\\d{2}" },
  SM: { length: 27, bban: "[A-Z]\\d{10}[A-Z0-9]{12}" },
  VA: { length: 22, bban: "\\d{18}" },
  LI: { length: 21, bban: "\\d{5}[A-Z0-9]{12}" },
  AD: { length: 24, bban: "\\d{8}[A-Z0-9]{12}" },
  AZ: { length: 28, bban: "[A-Z]{4}\\d{20}" },
  GE: { length: 22, bban: "[A-Z]{2}\\d{16}" },
  TL: { length: 23, bban: "\\d{19}" },
  FO: { length: 18, bban: "\\d{14}" },
  GL: { length: 18, bban: "\\d{14}" },
  IS: { length: 26, bban: "\\d{22}" },
  EG: { length: 29, bban: "\\d{25}" },
  IQ: { length: 23, bban: "[A-Z]{4}\\d{15}" },
  LC: { length: 32, bban: "[A-Z]{4}[A-Z0-9]{24}" },
  PS: { length: 29, bban: "[A-Z]{4}\\d{21}" },
};

/** Convert an IBAN to numeric representation for mod-97. */
function ibanToNumber(iban: string): string {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  return rearranged
    .split("")
    .map((ch) => (/[A-Z]/.test(ch) ? ch.charCodeAt(0) - 55 : ch))
    .join("");
}

/** Compute the two check digits for a BBAN + country code. */
export function computeIbanCheckDigits(countryCode: string, bban: string): string {
  const dummy = `${countryCode}00${bban}`;
  const num = ibanToNumber(dummy);
  // mod-97 by chunks to avoid bigint overflow issues
  let remainder = 0;
  for (let i = 0; i < num.length; i += 7) {
    remainder = Number(BigInt(remainder.toString() + num.slice(i, i + 7)) % BigInt(97));
  }
  const check = 98 - remainder;
  return check.toString().padStart(2, "0");
}

/** Validate an IBAN (structure + check digits). */
export function isValidIban(iban: string): boolean {
  const cleaned = iban.replace(/\s+/g, "").toUpperCase();
  const country = cleaned.slice(0, 2);
  const spec = IBAN_SPECS[country];
  if (!spec || cleaned.length !== spec.length) return false;
  const bban = cleaned.slice(4);
  if (!new RegExp(`^${spec.bban}$`).test(bban)) return false;
  const expected = computeIbanCheckDigits(country, bban);
  return cleaned.slice(2, 4) === expected;
}

/** Generate an ISO 13616-compliant IBAN for an account in the given country. */
export function generateIban(countryCode: string, accountNumber: string): string {
  const country = countryCode.toUpperCase();
  const spec = IBAN_SPECS[country];
  if (!spec) throw new Error(`IBAN generation not supported for country: ${country}`);
  const bbanLength = spec.length - 4;
  const bank = BANK_CODES[country] ?? "99999";
  const digits = accountNumber.replace(/\D/g, "");
  const padded = digits.padStart(Math.max(bbanLength - bank.length, 0), "0");
  let bban = (bank + padded).slice(0, bbanLength);
  // Structure guard: if the composed BBAN doesn't match the national format, fall back to digits
  if (!new RegExp(`^${spec.bban}$`).test(bban)) {
    bban = digits.padStart(bbanLength, "0");
  }
  const check = computeIbanCheckDigits(country, bban);
  return `${country}${check}${bban}`;
}

/** Format an IBAN in groups of 4. */
export function formatIban(iban: string): string {
  return iban.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
}

/** Mask an IBAN for display. */
export function maskIban(iban: string): string {
  const clean = iban.replace(/\s+/g, "");
  if (clean.length <= 8) return clean;
  return `${clean.slice(0, 4)} •••• •••• ${clean.slice(-4)}`;
}

/** Derive a BIC (SWIFT) from the bank + country, sandbox style. */
export function deriveBic(countryCode: string): string {
  return `${BANK_BIC_PREFIX}${countryCode.toUpperCase()}XX`;
}

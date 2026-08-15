/** Shared domain constants for the Capitech Bank platform. */

export const APP_NAME = "Capitech Bank";
export const APP_SHORT_NAME = "Capitech";
export const APP_TAGLINE = "Banking beyond borders";
export const APP_DOMAIN = "capitech.me";

export const SUPPORT_EMAIL = "support@capitech.me";
export const NO_REPLY_EMAIL = "no-reply@capitech.me";

/** Platform roles (app roles — mirror of the `roles` table). */
export const ROLES = {
  CUSTOMER: "customer",
  CORPORATE_ADMIN: "corporate_admin",
  STAFF_TELLER: "staff_teller",
  STAFF_OPS: "staff_operations",
  STAFF_COMPLIANCE: "staff_compliance",
  STAFF_ACCOUNTANT: "staff_accountant",
  STAFF_ADMIN: "staff_admin",
  SUPER_ADMIN: "super_admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const STAFF_ROLES: Role[] = [
  ROLES.STAFF_TELLER,
  ROLES.STAFF_OPS,
  ROLES.STAFF_COMPLIANCE,
  ROLES.STAFF_ACCOUNTANT,
  ROLES.STAFF_ADMIN,
  ROLES.SUPER_ADMIN,
];

export const ROLE_LABELS: Record<Role, string> = {
  customer: "Customer",
  corporate_admin: "Corporate Admin",
  staff_teller: "Teller",
  staff_operations: "Operations Officer",
  staff_compliance: "Compliance Officer",
  staff_accountant: "Accountant",
  staff_admin: "Administrator",
  super_admin: "Super Admin",
};

/** KYC levels & statuses. */
export const KYC_LEVELS = {
  UNVERIFIED: "unverified",
  LEVEL_1: "level_1", // identity verified
  LEVEL_2: "level_2", // address verified
  LEVEL_3: "level_3", // enhanced due diligence
} as const;

export const KYC_STATUS = {
  DRAFT: "draft",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export const KYC_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
};

/** Account / product types. */
export const PRODUCT_TYPES = {
  CURRENT: "current",
  SAVINGS: "savings",
  TERM_DEPOSIT: "term_deposit",
  CRYPTO: "crypto",
  MULTI_CURRENCY: "multi_currency",
} as const;

export const ACCOUNT_STATUS = {
  PENDING: "pending",
  ACTIVE: "active",
  FROZEN: "frozen",
  CLOSED: "closed",
} as const;

export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  active: "Active",
  frozen: "Frozen",
  closed: "Closed",
};

/** Transaction types (ledger event taxonomy). */
export const TX_TYPES = {
  INTERNAL_TRANSFER: "internal_transfer",
  OWN_TRANSFER: "own_transfer",
  DEPOSIT: "deposit", // money in (sandbox top-up)
  WITHDRAWAL: "withdrawal", // money out (sandbox cash-out)
  CARD_PURCHASE: "card_purchase",
  CARD_REFUND: "card_refund",
  FEE: "fee",
  INTEREST: "interest",
  CURRENCY_CONVERSION: "currency_conversion",
  CRYPTO_BUY: "crypto_buy",
  CRYPTO_SELL: "crypto_sell",
  DEPOSIT_PLACEMENT: "deposit_placement",
  DEPOSIT_MATURITY: "deposit_maturity",
} as const;

export const TX_STATUS = {
  DRAFT: "draft",
  PENDING: "pending", // awaiting maker-checker approval
  AUTHORIZED: "authorized", // approved, pending execution
  POSTED: "posted", // executed & ledgered
  REJECTED: "rejected",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export const TX_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending: "Pending approval",
  authorized: "Authorized",
  posted: "Completed",
  rejected: "Rejected",
  failed: "Failed",
  cancelled: "Cancelled",
};

/** Card statuses. */
export const CARD_STATUS = {
  PENDING: "pending",
  ACTIVE: "active",
  FROZEN: "frozen",
  EXPIRED: "expired",
  CLOSED: "closed",
} as const;

export const CARD_BRANDS = { VISA: "visa", MASTERCARD: "mastercard" } as const;

/** Chart of accounts categories. */
export const COA_CATEGORIES = {
  ASSET: "asset",
  LIABILITY: "liability",
  EQUITY: "equity",
  INCOME: "income",
  EXPENSE: "expense",
} as const;

export const COA_CATEGORY_LABELS: Record<string, string> = {
  asset: "Asset",
  liability: "Liability",
  equity: "Equity",
  income: "Income",
  expense: "Expense",
};

/** Default chart of accounts (IFRS-aligned, sandbox). */
export interface CoaSeed {
  code: string;
  name: string;
  category: (typeof COA_CATEGORIES)[keyof typeof COA_CATEGORIES];
  normalSide: "debit" | "credit";
  currencies?: string[]; // restrict to currencies; empty = all
}

export const DEFAULT_CHART_OF_ACCOUNTS: CoaSeed[] = [
  // ASSETS
  { code: "1000", name: "Cash on Hand", category: "asset", normalSide: "debit" },
  { code: "1100", name: "Nostro / Settlement Accounts", category: "asset", normalSide: "debit" },
  { code: "1200", name: "Loans & Advances", category: "asset", normalSide: "debit" },
  { code: "1300", name: "Crypto Assets Held", category: "asset", normalSide: "debit" },
  { code: "1400", name: "Interbank Placements", category: "asset", normalSide: "debit" },
  { code: "1500", name: "Property & Equipment", category: "asset", normalSide: "debit" },
  { code: "1600", name: "Intangible Assets", category: "asset", normalSide: "debit" },
  { code: "1700", name: "Prepaid Expenses", category: "asset", normalSide: "debit" },
  { code: "1800", name: "Receivables & Accruals", category: "asset", normalSide: "debit" },
  // LIABILITIES
  { code: "2000", name: "Customer Deposits — Current", category: "liability", normalSide: "credit" },
  { code: "2100", name: "Customer Deposits — Savings", category: "liability", normalSide: "credit" },
  { code: "2200", name: "Customer Term Deposits", category: "liability", normalSide: "credit" },
  { code: "2300", name: "Customer Crypto Balances", category: "liability", normalSide: "credit" },
  { code: "2400", name: "Interest Payable", category: "liability", normalSide: "credit" },
  { code: "2500", name: "Fees Received in Advance", category: "liability", normalSide: "credit" },
  { code: "2600", name: "Interbank Borrowings", category: "liability", normalSide: "credit" },
  { code: "2700", name: "Payables & Accruals", category: "liability", normalSide: "credit" },
  { code: "2800", name: "Suspense Accounts", category: "liability", normalSide: "credit" },
  { code: "2900", name: "VAT / Taxes Payable", category: "liability", normalSide: "credit" },
  // EQUITY
  { code: "3000", name: "Share Capital", category: "equity", normalSide: "credit" },
  { code: "3100", name: "Retained Earnings", category: "equity", normalSide: "credit" },
  { code: "3200", name: "Other Reserves", category: "equity", normalSide: "credit" },
  // INCOME
  { code: "4000", name: "Fee Income", category: "income", normalSide: "credit" },
  { code: "4100", name: "Interest Income", category: "income", normalSide: "credit" },
  { code: "4200", name: "FX & Conversion Income", category: "income", normalSide: "credit" },
  { code: "4300", name: "Card Interchange Income", category: "income", normalSide: "credit" },
  // EXPENSES
  { code: "5000", name: "Interest Expense", category: "expense", normalSide: "debit" },
  { code: "5100", name: "Staff Costs", category: "expense", normalSide: "debit" },
  { code: "5200", name: "Technology & Infrastructure", category: "expense", normalSide: "debit" },
  { code: "5300", name: "Marketing", category: "expense", normalSide: "debit" },
  { code: "5400", name: "Professional Fees", category: "expense", normalSide: "debit" },
  { code: "5500", name: "Depreciation & Amortisation", category: "expense", normalSide: "debit" },
  { code: "5600", name: "Impairment & Provisions", category: "expense", normalSide: "debit" },
  { code: "5700", name: "Regulatory & Compliance Costs", category: "expense", normalSide: "debit" },
  { code: "5800", name: "Other Operating Expenses", category: "expense", normalSide: "debit" },
];

/** Fee codes used by the ledger. */
export const FEE_CODES = {
  TRANSFER_OUT: "fee_transfer_out",
  TRANSFER_IN: "fee_transfer_in",
  CARD_ISSUE: "fee_card_issue",
  CARD_MONTHLY: "fee_card_monthly",
  EXCHANGE: "fee_exchange",
  WITHDRAWAL: "fee_withdrawal",
  DEPOSIT: "fee_deposit",
  STATEMENT: "fee_statement",
  MAINTENANCE: "fee_maintenance",
} as const;

/** ISO 8601 / timezone. */
export const DEFAULT_TIMEZONE = "UTC";

/** Supported settlement countries for account/IBAN generation (sandbox). */
export const SUPPORTED_IBAN_COUNTRIES = [
  "DE", "GB", "FR", "ES", "IT", "NL", "BE", "PT", "SE", "AT", "CH", "DK", "FI", "NO", "IE",
  "LU", "MT", "CY", "GR", "SK", "SI", "EE", "LV", "LT", "PL", "CZ", "HU", "RO", "BG", "HR",
  "AE", "SA", "TR", "IL", "KW", "BH", "QA", "OM", "JO", "MU", "SC", "CR", "DO", "GT", "SV",
  "BR", "KZ", "UA", "BY", "MD", "AL", "MK", "BA", "ME", "RS", "XK", "VG", "GI", "MC", "SM",
  "LI", "AD", "AZ", "GE", "IS",
];

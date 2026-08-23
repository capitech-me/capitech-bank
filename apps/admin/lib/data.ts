import { getServerClient } from "./supabase-server";
import { isSupabaseConfigured } from "./supabase-browser";

/* ============================================================
   Back office view models
   ============================================================ */

export interface KycQueueItem {
  id: string;
  customerNo: string;
  name: string;
  type: "retail" | "corporate";
  country: string;
  submittedAt: string;
  riskScore: number;
  isPep: boolean;
}

export interface CustomerRow {
  id: string;
  customerNo: string;
  name: string;
  type: "retail" | "corporate";
  kycStatus: string;
  kycLevel: string;
  country: string;
  riskScore: number;
  createdAt: string;
}

export interface AccountRow {
  id: string;
  accountNo: string;
  owner: string;
  product: string;
  currency: string;
  balance: string;
  status: string;
  frozen: boolean;
  createdAt: string;
}

export interface CoaRow {
  code: string;
  name: string;
  category: string;
  normalSide: string;
  balance: string;
  currency: string;
  active: boolean;
}

export interface JournalRow {
  id: string;
  journalNo: string;
  entryDate: string;
  description: string;
  reference: string;
  status: string;
  createdBy: string;
}

export interface ApprovalRow {
  id: string;
  orderNo: string;
  txType: string;
  amount: string;
  currency: string;
  fromAccount: string;
  toAccount: string;
  status: string;
  requestedAt: string;
  requestedBy: string;
}

export interface ProductRow {
  id: string;
  code: string;
  name: string;
  productType: string;
  currency: string | null;
  interestRate: string | null;
  monthlyFee: string | null;
  status: string;
}

export interface StaffRow {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastActive: string;
}

export interface AuditRow {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  ip: string;
  createdAt: string;
}

/** A single report line — one COA account in one currency. */
export interface ReportLine {
  code: string;
  name: string;
  currency: string;
  /** Display value (normalised so credit-normal categories show positive). */
  balance: number;
}

/** A grouped report section (e.g. Assets) with per-currency totals. */
export interface ReportSection {
  category: string;
  label: string;
  lines: ReportLine[];
  totals: Record<string, number>;
}

export interface BalanceSheetData {
  assets: ReportSection;
  liabilities: ReportSection;
  equity: ReportSection;
  totalsByCurrency: Record<string, { assets: number; liabilities: number; equity: number }>;
  balanced: boolean;
  hasBalances: boolean;
}

export interface ProfitAndLossData {
  income: ReportSection;
  expenses: ReportSection;
  totalsByCurrency: Record<string, { income: number; expenses: number; net: number }>;
}

export interface WebhookEndpointRow {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
}

export interface WebhookEventRow {
  id: string;
  endpointId: string | null;
  eventType: string;
  status: "pending" | "delivered" | "failed";
  attempts: number;
  createdAt: string;
}

export interface ApiUsageRow {
  id: string;
  endpoint: string;
  method: string;
  statusCode: number | null;
  latencyMs: number | null;
  createdAt: string;
}

export interface KycDocumentRow {
  id: string;
  customerId: string;
  documentType: string;
  filePath: string;
  status: string;
  createdAt: string;
}

/* ============================================================
   Demo data
   ============================================================ */

const demoKycQueue: KycQueueItem[] = [
  { id: "k-1", customerNo: "CAP-000001", name: "Fatima Al-Rashid", type: "retail", country: "AE", submittedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(), riskScore: 12, isPep: false },
  { id: "k-2", customerNo: "CAP-000002", name: "Blue Horizon Trading LLC", type: "corporate", country: "AE", submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), riskScore: 45, isPep: false },
  { id: "k-3", customerNo: "CAP-000003", name: "Marcus Webb", type: "retail", country: "GB", submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), riskScore: 8, isPep: false },
  { id: "k-4", customerNo: "CAP-000004", name: "Amina Yusuf", type: "retail", country: "NG", submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), riskScore: 22, isPep: false },
  { id: "k-5", customerNo: "CAP-000005", name: "Greenfield Capital Partners", type: "corporate", country: "US", submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), riskScore: 67, isPep: true },
  { id: "k-6", customerNo: "CAP-000006", name: "Sofia Marchetti", type: "retail", country: "IT", submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(), riskScore: 15, isPep: false },
  { id: "k-7", customerNo: "CAP-000007", name: "Tanaka Industries K.K.", type: "corporate", country: "JP", submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), riskScore: 30, isPep: false },
  { id: "k-8", customerNo: "CAP-000008", name: "Omar Haddad", type: "retail", country: "SA", submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 55).toISOString(), riskScore: 18, isPep: false },
];

const demoCustomers: CustomerRow[] = [
  { id: "c-1", customerNo: "CAP-000001", name: "Fatima Al-Rashid", type: "retail", kycStatus: "pending", kycLevel: "unverified", country: "AE", riskScore: 12, createdAt: "2026-08-15T10:00:00Z" },
  { id: "c-2", customerNo: "CAP-000002", name: "Blue Horizon Trading LLC", type: "corporate", kycStatus: "pending", kycLevel: "unverified", country: "AE", riskScore: 45, createdAt: "2026-08-15T08:30:00Z" },
  { id: "c-3", customerNo: "CAP-000003", name: "Marcus Webb", type: "retail", kycStatus: "pending", kycLevel: "unverified", country: "GB", riskScore: 8, createdAt: "2026-08-15T05:15:00Z" },
  { id: "c-4", customerNo: "CAP-000004", name: "Amina Yusuf", type: "retail", kycStatus: "pending", kycLevel: "unverified", country: "NG", riskScore: 22, createdAt: "2026-08-15T02:45:00Z" },
  { id: "c-5", customerNo: "CAP-000009", name: "Jane Doe", type: "retail", kycStatus: "approved", kycLevel: "level_2", country: "US", riskScore: 10, createdAt: "2026-07-20T09:00:00Z" },
  { id: "c-6", customerNo: "CAP-000010", name: "Acme Corp", type: "corporate", kycStatus: "approved", kycLevel: "level_2", country: "US", riskScore: 28, createdAt: "2026-07-18T11:30:00Z" },
];

const demoAccounts: AccountRow[] = [
  { id: "a-1", accountNo: "1002345678", owner: "Jane Doe", product: "Multi-Currency Current", currency: "USD", balance: "24580.42", status: "active", frozen: false, createdAt: "2026-07-20T09:05:00Z" },
  { id: "a-2", accountNo: "1008765432", owner: "Jane Doe", product: "Euro Current", currency: "EUR", balance: "12340.00", status: "active", frozen: false, createdAt: "2026-07-20T09:10:00Z" },
  { id: "a-3", accountNo: "2200112233", owner: "Jane Doe", product: "Savings Plus", currency: "GBP", balance: "8120.50", status: "active", frozen: false, createdAt: "2026-07-21T14:20:00Z" },
  { id: "a-4", accountNo: "9900112233", owner: "Acme Corp", product: "Corporate Current", currency: "USD", balance: "152340.90", status: "active", frozen: false, createdAt: "2026-07-18T12:00:00Z" },
  { id: "a-5", accountNo: "9911002244", owner: "Acme Corp", product: "Treasury EUR", currency: "EUR", balance: "88450.00", status: "frozen", frozen: true, createdAt: "2026-07-18T12:05:00Z" },
];

const demoCoa: CoaRow[] = [
  { code: "1000", name: "Cash on Hand", category: "asset", normalSide: "debit", balance: "450000.00", currency: "USD", active: true },
  { code: "1100", name: "Nostro / Settlement Accounts", category: "asset", normalSide: "debit", balance: "8240130.55", currency: "USD", active: true },
  { code: "1300", name: "Crypto Assets Held", category: "asset", normalSide: "debit", balance: "0.00", currency: "USD", active: true },
  { code: "2000", name: "Customer Deposits — Current", category: "liability", normalSide: "credit", balance: "-6123400.90", currency: "USD", active: true },
  { code: "2100", name: "Customer Deposits — Savings", category: "liability", normalSide: "credit", balance: "-8120.50", currency: "GBP", active: true },
  { code: "2200", name: "Customer Term Deposits", category: "liability", normalSide: "credit", balance: "-7500.00", currency: "USD", active: true },
  { code: "3000", name: "Share Capital", category: "equity", normalSide: "credit", balance: "-2000000.00", currency: "USD", active: true },
  { code: "4000", name: "Fee Income", category: "income", normalSide: "credit", balance: "-48215.00", currency: "USD", active: true },
  { code: "4100", name: "Interest Income", category: "income", normalSide: "credit", balance: "-12340.50", currency: "USD", active: true },
  { code: "5000", name: "Interest Expense", category: "expense", normalSide: "debit", balance: "2430.75", currency: "USD", active: true },
  { code: "5200", name: "Technology & Infrastructure", category: "expense", normalSide: "debit", balance: "98000.00", currency: "USD", active: true },
];

const demoJournals: JournalRow[] = [
  { id: "j-1", journalNo: "GL-20260815-001", entryDate: "2026-08-15T11:00:00Z", description: "Internal transfer Jane Doe → Amina Yusuf", reference: "PAY-20260815-0012", status: "posted", createdBy: "system" },
  { id: "j-2", journalNo: "GL-20260815-002", entryDate: "2026-08-15T10:20:00Z", description: "Card purchase settlement — Amazon", reference: "CRD-20260815-0044", status: "posted", createdBy: "system" },
  { id: "j-3", journalNo: "GL-20260815-003", entryDate: "2026-08-15T09:00:00Z", description: "Deposit top-up — Jane Doe", reference: "DEP-20260815-010", status: "posted", createdBy: "system" },
  { id: "j-4", journalNo: "GL-20260814-021", entryDate: "2026-08-14T16:30:00Z", description: "Savings interest accrual posting", reference: "INT-20260814", status: "posted", createdBy: "system" },
  { id: "j-5", journalNo: "GL-20260814-020", entryDate: "2026-08-14T15:10:00Z", description: "Fee income — transfer fee", reference: "FEE-20260814-88", status: "posted", createdBy: "system" },
];

const demoApprovals: ApprovalRow[] = [
  { id: "ap-1", orderNo: "PAY-20260815-0012", txType: "internal_transfer", amount: "350.00", currency: "USD", fromAccount: "1002345678", toAccount: "5522110099", status: "pending", requestedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(), requestedBy: "Jane Doe" },
  { id: "ap-2", orderNo: "PAY-20260815-0013", txType: "withdrawal", amount: "5200.00", currency: "USD", fromAccount: "9900112233", toAccount: "DE89370400440532013000", status: "pending", requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), requestedBy: "Acme Corp" },
  { id: "ap-3", orderNo: "PAY-20260815-0014", txType: "withdrawal", amount: "12300.00", currency: "EUR", fromAccount: "9911002244", toAccount: "GB29NWBK60161331926819", status: "pending", requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), requestedBy: "Acme Corp" },
];

const demoProducts: ProductRow[] = [
  { id: "p-1", code: "CUR_MULTI", name: "Multi-Currency Current", productType: "current", currency: null, interestRate: null, monthlyFee: "0", status: "active" },
  { id: "p-2", code: "SAV_USD", name: "Savings Plus (USD)", productType: "savings", currency: "USD", interestRate: "3.50", monthlyFee: "0", status: "active" },
  { id: "p-3", code: "SAV_EUR", name: "Savings Plus (EUR)", productType: "savings", currency: "EUR", interestRate: "2.75", monthlyFee: "0", status: "active" },
  { id: "p-4", code: "TD_USD", name: "Fixed Term Deposit (USD)", productType: "term_deposit", currency: "USD", interestRate: "4.25", monthlyFee: null, status: "active" },
  { id: "p-5", code: "TD_EUR", name: "Fixed Term Deposit (EUR)", productType: "term_deposit", currency: "EUR", interestRate: "3.10", monthlyFee: null, status: "active" },
  { id: "p-6", code: "CORP_USD", name: "Corporate Current", productType: "current", currency: "USD", interestRate: null, monthlyFee: "49", status: "active" },
];

const demoStaff: StaffRow[] = [
  { id: "s-1", name: "Sarah Mitchell", email: "sarah@capitech.me", role: "staff_admin", status: "active", lastActive: new Date().toISOString() },
  { id: "s-2", name: "David Chen", email: "david@capitech.me", role: "staff_operations", status: "active", lastActive: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
  { id: "s-3", name: "Layla Hassan", email: "layla@capitech.me", role: "staff_compliance", status: "active", lastActive: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  { id: "s-4", name: "Tom Becker", email: "tom@capitech.me", role: "staff_accountant", status: "active", lastActive: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString() },
  { id: "s-5", name: "Nadia Petrova", email: "nadia@capitech.me", role: "staff_teller", status: "suspended", lastActive: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString() },
];

const demoAudit: AuditRow[] = [
  { id: "au-1", actor: "Layla Hassan", action: "kyc.approve", entity: "customer", entityId: "CAP-000009", details: "Approved retail KYC to level_2", ip: "10.0.4.12", createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString() },
  { id: "au-2", actor: "David Chen", action: "payment.approve", entity: "payment_orders", entityId: "PAY-20260815-0010", details: "Approved internal transfer $120.00", ip: "10.0.4.7", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
  { id: "au-3", actor: "Sarah Mitchell", action: "account.freeze", entity: "accounts", entityId: "9911002244", details: "Froze account per compliance hold", ip: "10.0.4.3", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString() },
  { id: "au-4", actor: "Tom Becker", action: "ledger.adjust", entity: "gl_entries", entityId: "GL-20260814-021", details: "Posted interest accrual batch", ip: "10.0.4.19", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString() },
];

const demoWebhookEndpoints: WebhookEndpointRow[] = [
  { id: "wh-1", url: "https://acme.example.com/hooks/payments", events: ["payment.completed", "payment.failed"], active: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString() },
  { id: "wh-2", url: "https://treasury.acme.example.com/hooks/settlements", events: ["ledger.posted"], active: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
  { id: "wh-3", url: "https://sandbox.acme.example.com/hooks", events: ["*"], active: false, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString() },
];

const demoWebhookEvents: WebhookEventRow[] = [
  { id: "we-1", endpointId: "wh-1", eventType: "payment.completed", status: "delivered", attempts: 1, createdAt: new Date(Date.now() - 1000 * 60 * 22).toISOString() },
  { id: "we-2", endpointId: "wh-1", eventType: "payment.failed", status: "failed", attempts: 3, createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString() },
  { id: "we-3", endpointId: "wh-2", eventType: "ledger.posted", status: "delivered", attempts: 1, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
  { id: "we-4", endpointId: "wh-1", eventType: "payment.completed", status: "pending", attempts: 0, createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString() },
];

const demoApiUsage: ApiUsageRow[] = [
  { id: "u-1", endpoint: "/v1/accounts", method: "GET", statusCode: 200, latencyMs: 42, createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString() },
  { id: "u-2", endpoint: "/v1/transfers", method: "POST", statusCode: 201, latencyMs: 118, createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString() },
  { id: "u-3", endpoint: "/v1/transfers/PAY-20260815-0012", method: "GET", statusCode: 200, latencyMs: 31, createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString() },
  { id: "u-4", endpoint: "/v1/transfers", method: "POST", statusCode: 429, latencyMs: 14, createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString() },
  { id: "u-5", endpoint: "/v1/accounts/1002345678", method: "GET", statusCode: 401, latencyMs: 9, createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
];

/* ============================================================
   Data access
   ============================================================ */

/** Row shapes (as consumed) for the Supabase queries below. */
interface CustomersRow {
  id: string;
  customer_no: string;
  legal_first_name: string;
  legal_last_name: string;
  customer_type: "retail" | "corporate";
  country_of_residence: string;
  kyc_status: string;
  kyc_level?: string;
  risk_score: number;
  is_pep: boolean;
  created_at: string;
}

interface AccountsRow {
  id: string;
  account_no: string;
  owner_id: string;
  currency: string;
  status: string;
  frozen: boolean;
  created_at: string;
  products:
    | { name?: string; product_type?: string }
    | { name?: string; product_type?: string }[]
    | null;
}

interface CoaRowInput {
  code: string;
  name: string;
  category: string;
  normal_side: string;
  currency: string;
  active: boolean;
}

interface GlEntryRow {
  id: string;
  journal_no: string;
  entry_date: string;
  description: string;
  reference_id: string;
  status: string;
  created_by: string;
}

interface PaymentOrderRow {
  id: string;
  order_no: string;
  tx_type: string;
  amount: string;
  currency: string;
  from_account_id: string;
  to_iban: string;
  to_account_id: string;
  status: string;
  created_at: string;
  created_by: string;
}

interface ProductRowInput {
  id: string;
  code: string;
  name: string;
  product_type: string;
  currency: string;
  interest_rate: string;
  monthly_fee: string;
  status: string;
}

interface ProfileRow {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface OperationLogRow {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  ip_address: string;
  created_at: string;
}

interface CoaAccountRowInput {
  id: string;
  code: string;
  name: string;
  category: string;
  currency: string | null;
  active: boolean;
}

interface BalanceRowInput {
  coa_account_id: string;
  currency: string;
  ledger_balance: string;
}

interface WebhookEndpointRowInput {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
}

interface WebhookEventRowInput {
  id: string;
  endpoint_id: string | null;
  event_type: string;
  status: "pending" | "delivered" | "failed";
  attempts: number;
  created_at: string;
}

interface ApiUsageRowInput {
  id: string;
  endpoint: string;
  method: string;
  status_code: number | null;
  latency_ms: number | null;
  created_at: string;
}

interface KycDocumentRowInput {
  id: string;
  customer_id: string | null;
  organization_id: string | null;
  document_type: string;
  file_path: string;
  status: string;
  created_at: string;
}

export async function getKycQueue(): Promise<KycQueueItem[]> {
  if (!isSupabaseConfigured()) return demoKycQueue;
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, customer_no, legal_first_name, legal_last_name, customer_type, country_of_residence, kyc_status, risk_score, is_pep, created_at")
    .eq("kyc_status", "pending")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row: CustomersRow) => ({
    id: row.id,
    customerNo: row.customer_no,
    name: [row.legal_first_name, row.legal_last_name].filter(Boolean).join(" ") || "Unknown",
    type: row.customer_type,
    country: row.country_of_residence,
    submittedAt: row.created_at,
    riskScore: row.risk_score,
    isPep: row.is_pep,
  }));
}

export async function getCustomers(): Promise<CustomerRow[]> {
  if (!isSupabaseConfigured()) return demoCustomers;
  const supabase = await getServerClient();
  const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: false }).limit(100);
  if (error || !data) return [];
  return data.map((row: CustomersRow) => ({
    id: row.id,
    customerNo: row.customer_no,
    name: [row.legal_first_name, row.legal_last_name].filter(Boolean).join(" ") || "Unknown",
    type: row.customer_type,
    kycStatus: row.kyc_status,
    kycLevel: row.kyc_level ?? "",
    country: row.country_of_residence,
    riskScore: row.risk_score,
    createdAt: row.created_at,
  }));
}

export async function getAccounts(): Promise<AccountRow[]> {
  if (!isSupabaseConfigured()) return demoAccounts;
  const supabase = await getServerClient();
  const { data, error } = await supabase.from("accounts").select("*, products(name, product_type)").order("created_at", { ascending: false }).limit(100);
  if (error || !data) return [];
  return data.map((row: AccountsRow) => {
    const product = Array.isArray(row.products) ? row.products[0] : row.products;
    return {
      id: row.id,
      accountNo: row.account_no,
      owner: row.owner_id,
      product: product?.name ?? "Account",
      currency: row.currency,
      balance: "0",
      status: row.status,
      frozen: row.frozen,
      createdAt: row.created_at,
    };
  });
}

export async function getCoa(): Promise<CoaRow[]> {
  if (!isSupabaseConfigured()) return demoCoa;
  const supabase = await getServerClient();
  const { data, error } = await supabase.from("coa_accounts").select("*").order("code");
  if (error || !data) return [];
  return data.map((row: CoaRowInput) => ({
    code: row.code,
    name: row.name,
    category: row.category,
    normalSide: row.normal_side,
    balance: "0",
    currency: row.currency ?? "USD",
    active: row.active,
  }));
}

export async function getJournals(): Promise<JournalRow[]> {
  if (!isSupabaseConfigured()) return demoJournals;
  const supabase = await getServerClient();
  const { data, error } = await supabase.from("gl_entries").select("*").order("entry_date", { ascending: false }).limit(50);
  if (error || !data) return [];
  return data.map((row: GlEntryRow) => ({
    id: row.id,
    journalNo: row.journal_no,
    entryDate: row.entry_date,
    description: row.description,
    reference: row.reference_id ?? "",
    status: row.status,
    createdBy: row.created_by ?? "system",
  }));
}

export async function getApprovals(): Promise<ApprovalRow[]> {
  if (!isSupabaseConfigured()) return demoApprovals;
  const supabase = await getServerClient();
  const { data, error } = await supabase.from("payment_orders").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(50);
  if (error || !data) return [];
  return data.map((row: PaymentOrderRow) => ({
    id: row.id,
    orderNo: row.order_no,
    txType: row.tx_type,
    amount: row.amount,
    currency: row.currency,
    fromAccount: row.from_account_id ?? "",
    toAccount: row.to_iban ?? row.to_account_id ?? "",
    status: row.status,
    requestedAt: row.created_at,
    requestedBy: row.created_by ?? "",
  }));
}

export async function getProducts(): Promise<ProductRow[]> {
  if (!isSupabaseConfigured()) return demoProducts;
  const supabase = await getServerClient();
  const { data, error } = await supabase.from("products").select("*").order("code");
  if (error || !data) return [];
  return data.map((row: ProductRowInput) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    productType: row.product_type,
    currency: row.currency,
    interestRate: row.interest_rate,
    monthlyFee: row.monthly_fee,
    status: row.status,
  }));
}

export async function getStaff(): Promise<StaffRow[]> {
  if (!isSupabaseConfigured()) return demoStaff;
  const supabase = await getServerClient();
  const { data, error } = await supabase.from("profiles").select("id, first_name, last_name, role").in("role", ["staff_teller", "staff_operations", "staff_compliance", "staff_accountant", "staff_admin", "super_admin"]);
  if (error || !data) return [];
  return data.map((row: ProfileRow) => ({
    id: row.id,
    name: [row.first_name, row.last_name].filter(Boolean).join(" ") || "Unknown",
    email: "",
    role: row.role,
    status: "active",
    lastActive: new Date().toISOString(),
  }));
}

export async function getAuditLog(): Promise<AuditRow[]> {
  if (!isSupabaseConfigured()) return demoAudit;
  const supabase = await getServerClient();
  const { data, error } = await supabase.from("operation_logs").select("*").order("created_at", { ascending: false }).limit(100);
  if (error || !data) return [];
  return data.map((row: OperationLogRow) => ({
    id: row.id,
    actor: row.actor_id ?? "system",
    action: row.action,
    entity: row.entity_type ?? "",
    entityId: row.entity_id ?? "",
    details: JSON.stringify(row.details ?? {}),
    ip: row.ip_address ?? "",
    createdAt: row.created_at,
  }));
}

/* ============================================================
   Financial reports (balance sheet & profit & loss)
   ============================================================ */

const CREDIT_NORMAL_CATEGORIES = new Set(["liability", "equity", "income"]);

function buildReportSection(
  category: string,
  label: string,
  coaRows: CoaAccountRowInput[],
  balancesByAccount: Map<string, { currency: string; ledgerBalance: number }[]>
): ReportSection {
  const lines: ReportLine[] = [];
  const totals: Record<string, number> = {};
  for (const coa of coaRows) {
    if (coa.category !== category) continue;
    const balances = balancesByAccount.get(coa.id);
    if (balances && balances.length > 0) {
      for (const b of balances) {
        const display = CREDIT_NORMAL_CATEGORIES.has(category) ? -b.ledgerBalance : b.ledgerBalance;
        lines.push({ code: coa.code, name: coa.name, currency: b.currency, balance: display });
        totals[b.currency] = (totals[b.currency] ?? 0) + display;
      }
    } else {
      const currency = coa.currency ?? "USD";
      lines.push({ code: coa.code, name: coa.name, currency, balance: 0 });
    }
  }
  return { category, label, lines, totals };
}

function buildDemoReportSection(category: string, label: string): ReportSection {
  const lines: ReportLine[] = [];
  const totals: Record<string, number> = {};
  for (const row of demoCoa) {
    if (row.category !== category) continue;
    const raw = Number(row.balance);
    const display = CREDIT_NORMAL_CATEGORIES.has(category) ? -raw : raw;
    lines.push({ code: row.code, name: row.name, currency: row.currency, balance: display });
    totals[row.currency] = (totals[row.currency] ?? 0) + display;
  }
  return { category, label, lines, totals };
}

function computeBalanceSheetTotals(assets: ReportSection, liabilities: ReportSection, equity: ReportSection) {
  const currencies = new Set<string>([
    ...Object.keys(assets.totals),
    ...Object.keys(liabilities.totals),
    ...Object.keys(equity.totals),
  ]);
  const totalsByCurrency: Record<string, { assets: number; liabilities: number; equity: number }> = {};
  let balanced = true;
  let hasBalances = false;
  for (const currency of currencies) {
    const a = assets.totals[currency] ?? 0;
    const l = liabilities.totals[currency] ?? 0;
    const e = equity.totals[currency] ?? 0;
    if (a !== 0 || l !== 0 || e !== 0) hasBalances = true;
    totalsByCurrency[currency] = { assets: a, liabilities: l, equity: e };
    if (Math.abs(a - (l + e)) > 0.005) balanced = false;
  }
  return { totalsByCurrency, balanced, hasBalances };
}

export async function getBalanceSheet(): Promise<BalanceSheetData> {
  if (!isSupabaseConfigured()) {
    const assets = buildDemoReportSection("asset", "Assets");
    const liabilities = buildDemoReportSection("liability", "Liabilities");
    const equity = buildDemoReportSection("equity", "Equity");
    return { assets, liabilities, equity, ...computeBalanceSheetTotals(assets, liabilities, equity) };
  }
  const supabase = await getServerClient();
  const [coaRes, balRes] = await Promise.all([
    supabase.from("coa_accounts").select("*").eq("active", true).order("code"),
    supabase.from("balances").select("coa_account_id, currency, ledger_balance"),
  ]);
  const coaRows = (coaRes.data ?? []) as CoaAccountRowInput[];
  const balancesByAccount = new Map<string, { currency: string; ledgerBalance: number }[]>();
  for (const row of (balRes.data ?? []) as BalanceRowInput[]) {
    const list = balancesByAccount.get(row.coa_account_id) ?? [];
    list.push({ currency: row.currency, ledgerBalance: Number(row.ledger_balance) });
    balancesByAccount.set(row.coa_account_id, list);
  }
  const assets = buildReportSection("asset", "Assets", coaRows, balancesByAccount);
  const liabilities = buildReportSection("liability", "Liabilities", coaRows, balancesByAccount);
  const equity = buildReportSection("equity", "Equity", coaRows, balancesByAccount);
  return { assets, liabilities, equity, ...computeBalanceSheetTotals(assets, liabilities, equity) };
}

function computeProfitAndLossTotals(income: ReportSection, expenses: ReportSection) {
  const currencies = new Set<string>([...Object.keys(income.totals), ...Object.keys(expenses.totals)]);
  const totalsByCurrency: Record<string, { income: number; expenses: number; net: number }> = {};
  for (const currency of currencies) {
    const inc = income.totals[currency] ?? 0;
    const exp = expenses.totals[currency] ?? 0;
    totalsByCurrency[currency] = { income: inc, expenses: exp, net: inc - exp };
  }
  return totalsByCurrency;
}

export async function getProfitAndLoss(): Promise<ProfitAndLossData> {
  if (!isSupabaseConfigured()) {
    const income = buildDemoReportSection("income", "Income");
    const expenses = buildDemoReportSection("expense", "Expenses");
    return { income, expenses, totalsByCurrency: computeProfitAndLossTotals(income, expenses) };
  }
  const supabase = await getServerClient();
  const [coaRes, balRes] = await Promise.all([
    supabase.from("coa_accounts").select("*").eq("active", true).order("code"),
    supabase.from("balances").select("coa_account_id, currency, ledger_balance"),
  ]);
  const coaRows = (coaRes.data ?? []) as CoaAccountRowInput[];
  const balancesByAccount = new Map<string, { currency: string; ledgerBalance: number }[]>();
  for (const row of (balRes.data ?? []) as BalanceRowInput[]) {
    const list = balancesByAccount.get(row.coa_account_id) ?? [];
    list.push({ currency: row.currency, ledgerBalance: Number(row.ledger_balance) });
    balancesByAccount.set(row.coa_account_id, list);
  }
  const income = buildReportSection("income", "Income", coaRows, balancesByAccount);
  const expenses = buildReportSection("expense", "Expenses", coaRows, balancesByAccount);
  return { income, expenses, totalsByCurrency: computeProfitAndLossTotals(income, expenses) };
}

/* ============================================================
   Webhooks & API usage
   ============================================================ */

export async function getWebhookEndpoints(): Promise<WebhookEndpointRow[]> {
  if (!isSupabaseConfigured()) return demoWebhookEndpoints;
  const supabase = await getServerClient();
  const { data, error } = await supabase.from("webhook_endpoints").select("*").order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row: WebhookEndpointRowInput) => ({
    id: row.id,
    url: row.url,
    events: row.events ?? [],
    active: row.active,
    createdAt: row.created_at,
  }));
}

export async function getWebhookEvents(): Promise<WebhookEventRow[]> {
  if (!isSupabaseConfigured()) return demoWebhookEvents;
  const supabase = await getServerClient();
  const { data, error } = await supabase.from("webhook_events").select("*").order("created_at", { ascending: false }).limit(50);
  if (error || !data) return [];
  return data.map((row: WebhookEventRowInput) => ({
    id: row.id,
    endpointId: row.endpoint_id,
    eventType: row.event_type,
    status: row.status,
    attempts: row.attempts,
    createdAt: row.created_at,
  }));
}

export async function getApiUsage(): Promise<ApiUsageRow[]> {
  if (!isSupabaseConfigured()) return demoApiUsage;
  const supabase = await getServerClient();
  const { data, error } = await supabase.from("api_usage_logs").select("*").order("created_at", { ascending: false }).limit(20);
  if (error || !data) return [];
  return data.map((row: ApiUsageRowInput) => ({
    id: row.id,
    endpoint: row.endpoint,
    method: row.method,
    statusCode: row.status_code,
    latencyMs: row.latency_ms,
    createdAt: row.created_at,
  }));
}

/* ============================================================
   Contact messages (C11)
   ============================================================ */

export interface ContactMessageRow {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "new" | "responded" | "closed";
  createdAt: string;
}

const demoContactMessages: ContactMessageRow[] = [
  {
    id: "cm-1",
    name: "Aisha Khan",
    email: "aisha@example.com",
    subject: "Corporate onboarding",
    message: "How long does corporate onboarding take for an LLC in the UAE? We need to move money this month.",
    status: "new",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: "cm-2",
    name: "Marco Rossi",
    email: "marco@example.com",
    subject: "Virtual card limit",
    message: "Could you raise my daily virtual card limit for a one-off purchase this weekend?",
    status: "responded",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  },
  {
    id: "cm-3",
    name: "Oluwatobi Adeyemi",
    email: "tobi@example.com",
    subject: "Open API sandbox",
    message: "How do I get scoped API keys for the sandbox environment? The docs mention webhooks but I can't find the keys page.",
    status: "closed",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
];

interface ContactMessageRowInput {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: string;
  created_at: string;
}

export async function getContactMessages(): Promise<ContactMessageRow[]> {
  if (!isSupabaseConfigured()) return demoContactMessages;
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error || !data) return [];
  return data.map((row: ContactMessageRowInput) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject ?? "",
    message: row.message,
    status: row.status as ContactMessageRow["status"],
    createdAt: row.created_at,
  }));
}

/** KYC documents grouped by customer id (staff may read via RLS). */
export async function getKycDocuments(customerIds: string[]): Promise<Record<string, KycDocumentRow[]>> {
  if (!isSupabaseConfigured() || customerIds.length === 0) return {};
  const supabase = await getServerClient();
  const { data, error } = await supabase.from("kyc_documents").select("*").in("customer_id", customerIds);
  if (error || !data) return {};
  const grouped: Record<string, KycDocumentRow[]> = {};
  for (const row of data as KycDocumentRowInput[]) {
    if (!row.customer_id) continue;
    const list = grouped[row.customer_id] ?? [];
    list.push({
      id: row.id,
      customerId: row.customer_id,
      documentType: row.document_type,
      filePath: row.file_path,
      status: row.status,
      createdAt: row.created_at,
    });
    grouped[row.customer_id] = list;
  }
  return grouped;
}

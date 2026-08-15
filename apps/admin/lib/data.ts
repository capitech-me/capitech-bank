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

/* ============================================================
   Data access
   ============================================================ */

export async function getKycQueue(): Promise<KycQueueItem[]> {
  if (!isSupabaseConfigured()) return demoKycQueue;
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, customer_no, legal_first_name, legal_last_name, customer_type, country_of_residence, kyc_status, risk_score, is_pep, created_at")
    .eq("kyc_status", "pending")
    .order("created_at", { ascending: false });
  if (error || !data) return demoKycQueue;
  return data.map((row: any) => ({
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
  if (error || !data) return demoCustomers;
  return data.map((row: any) => ({
    id: row.id,
    customerNo: row.customer_no,
    name: [row.legal_first_name, row.legal_last_name].filter(Boolean).join(" ") || "Unknown",
    type: row.customer_type,
    kycStatus: row.kyc_status,
    kycLevel: row.kyc_level,
    country: row.country_of_residence,
    riskScore: row.risk_score,
    createdAt: row.created_at,
  }));
}

export async function getAccounts(): Promise<AccountRow[]> {
  if (!isSupabaseConfigured()) return demoAccounts;
  const supabase = await getServerClient();
  const { data, error } = await supabase.from("accounts").select("*, products(name, product_type)").order("created_at", { ascending: false }).limit(100);
  if (error || !data) return demoAccounts;
  return data.map((row: any) => ({
    id: row.id,
    accountNo: row.account_no,
    owner: row.owner_id,
    product: row.products?.name ?? "Account",
    currency: row.currency,
    balance: "0",
    status: row.status,
    frozen: row.frozen,
    createdAt: row.created_at,
  }));
}

export async function getCoa(): Promise<CoaRow[]> {
  if (!isSupabaseConfigured()) return demoCoa;
  const supabase = await getServerClient();
  const { data, error } = await supabase.from("coa_accounts").select("*").order("code");
  if (error || !data) return demoCoa;
  return data.map((row: any) => ({
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
  if (error || !data) return demoJournals;
  return data.map((row: any) => ({
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
  if (error || !data) return demoApprovals;
  return data.map((row: any) => ({
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
  if (error || !data) return demoProducts;
  return data.map((row: any) => ({
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
  if (error || !data) return demoStaff;
  return data.map((row: any) => ({
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
  if (error || !data) return demoAudit;
  return data.map((row: any) => ({
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

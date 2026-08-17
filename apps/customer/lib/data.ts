import { getServerClient } from "./supabase-server";
import { isSupabaseConfigured } from "./supabase-browser";
import {
  generateIban,
  deriveBic,
  formatRelativeTime,
  TX_TYPES,
} from "@capitech/lib";

/* ============================================================
   View models shared by UI components
   ============================================================ */

export interface AccountVM {
  id: string;
  accountNo: string;
  iban: string;
  bic: string;
  productName: string;
  productType: string;
  currency: string;
  status: string;
  nickname: string | null;
  ledgerBalance: string;
  availableBalance: string;
  frozen: boolean;
  openedAt: string;
}

export interface TransactionVM {
  id: string;
  txType: string;
  status: string;
  amount: string;
  currency: string;
  direction: "in" | "out";
  counterparty: string;
  reference: string;
  narration: string | null;
  createdAt: string;
}

export interface CardVM {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  status: string;
  frozen: boolean;
  onlineEnabled: boolean;
  dailyLimit: string | null;
  nameOnCard: string | null;
  accountId: string;
}

export interface DepositVM {
  id: string;
  principal: string;
  currency: string;
  interestRate: string;
  termDays: number;
  startDate: string;
  maturityDate: string;
  interestAccrued: string;
  rollover: boolean;
  status: string;
}

export interface ProductVM {
  id: string;
  code: string;
  name: string;
  productType: string;
  currency: string | null;
  interestRate: string | null;
  minOpeningBalance: string | null;
  monthlyFee: string | null;
  description: string | null;
}

export interface NotificationVM {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
}

/* ============================================================
   Demo mode — curated sample data
   ============================================================ */

const DEMO_IBAN = generateIban("DE", "1002345678");
const DEMO_IBAN_EUR = generateIban("DE", "1008765432");
const DEMO_IBAN_GBP = generateIban("GB", "2200112233");

const demoAccounts: AccountVM[] = [
  {
    id: "acct-100",
    accountNo: "1002345678",
    iban: DEMO_IBAN,
    bic: deriveBic("DE"),
    productName: "Multi-Currency Current",
    productType: "current",
    currency: "USD",
    status: "active",
    nickname: "Everyday",
    ledgerBalance: "24580.42",
    availableBalance: "24580.42",
    frozen: false,
    openedAt: "2025-11-02T09:00:00Z",
  },
  {
    id: "acct-200",
    accountNo: "1008765432",
    iban: DEMO_IBAN_EUR,
    bic: deriveBic("DE"),
    productName: "Euro Current",
    productType: "current",
    currency: "EUR",
    status: "active",
    nickname: "Travel",
    ledgerBalance: "12340.00",
    availableBalance: "12340.00",
    frozen: false,
    openedAt: "2025-11-02T09:05:00Z",
  },
  {
    id: "acct-300",
    accountNo: "2200112233",
    iban: DEMO_IBAN_GBP,
    bic: deriveBic("GB"),
    productName: "Savings Plus",
    productType: "savings",
    currency: "GBP",
    status: "active",
    nickname: "Rainy day",
    ledgerBalance: "8120.50",
    availableBalance: "8120.50",
    frozen: false,
    openedAt: "2026-01-15T14:20:00Z",
  },
];

const demoTransactions: TransactionVM[] = [
  { id: "tx-1", txType: TX_TYPES.INTERNAL_TRANSFER, status: "posted", amount: "350.00", currency: "USD", direction: "in", counterparty: "Amina Yusuf", reference: "Rent share", narration: "Monthly rent share", createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString() },
  { id: "tx-2", txType: TX_TYPES.CARD_PURCHASE, status: "posted", amount: "42.18", currency: "USD", direction: "out", counterparty: "Amazon Marketplace", reference: "Card 4242", narration: "Online purchase", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  { id: "tx-3", txType: TX_TYPES.DEPOSIT, status: "posted", amount: "1500.00", currency: "USD", direction: "in", counterparty: "Sandbox Top-up", reference: "DEP-20260815", narration: "Card deposit", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString() },
  { id: "tx-4", txType: TX_TYPES.CARD_PURCHASE, status: "posted", amount: "9.99", currency: "USD", direction: "out", counterparty: "Spotify", reference: "Card 4242", narration: "Subscription", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString() },
  { id: "tx-5", txType: TX_TYPES.INTEREST, status: "posted", amount: "12.34", currency: "USD", direction: "in", counterparty: "Capitech Bank", reference: "INT-AUG", narration: "Savings interest", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 49).toISOString() },
  { id: "tx-6", txType: TX_TYPES.CURRENCY_CONVERSION, status: "posted", amount: "500.00", currency: "USD", direction: "out", counterparty: "FX Desk", reference: "FX-881234", narration: "USD → EUR @ 0.9245", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString() },
  { id: "tx-7", txType: TX_TYPES.FEE, status: "posted", amount: "2.00", currency: "USD", direction: "out", counterparty: "Capitech Bank", reference: "FEE-TRANSFER", narration: "Transfer fee", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString() },
];

const demoCards: CardVM[] = [
  { id: "card-1", brand: "visa", last4: "4242", expMonth: 8, expYear: 2030, status: "active", frozen: false, onlineEnabled: true, dailyLimit: "2000.00", nameOnCard: "JANE DOE", accountId: "acct-100" },
  { id: "card-2", brand: "mastercard", last4: "5518", expMonth: 11, expYear: 2029, status: "active", frozen: true, onlineEnabled: true, dailyLimit: "500.00", nameOnCard: "JANE DOE", accountId: "acct-100" },
];

const demoDeposits: DepositVM[] = [
  { id: "dep-1", principal: "5000.00", currency: "USD", interestRate: "4.25", termDays: 90, startDate: "2026-06-01", maturityDate: "2026-08-30", interestAccrued: "41.98", rollover: false, status: "active" },
  { id: "dep-2", principal: "2500.00", currency: "EUR", interestRate: "3.10", termDays: 180, startDate: "2026-03-15", maturityDate: "2026-09-11", interestAccrued: "37.56", rollover: true, status: "active" },
];

const demoProducts: ProductVM[] = [
  { id: "prod-current", code: "CUR_USD", name: "Multi-Currency Current", productType: "current", currency: null, interestRate: null, minOpeningBalance: "0", monthlyFee: "0", description: "Everyday account in 30+ currencies with instant transfers." },
  { id: "prod-savings", code: "SAV_USD", name: "Savings Plus", productType: "savings", currency: "USD", interestRate: "3.50", minOpeningBalance: "100", monthlyFee: "0", description: "High-yield savings with daily interest accrual." },
  { id: "prod-deposit", code: "TD_USD", name: "Fixed Term Deposit", productType: "term_deposit", currency: "USD", interestRate: "4.25", minOpeningBalance: "1000", monthlyFee: null, description: "Fixed-rate term deposits from 7 days." },
];

const demoNotifications: NotificationVM[] = [
  { id: "n-1", type: "transaction", title: "Payment received", body: "You received $350.00 from Amina Yusuf.", read: false, createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString() },
  { id: "n-2", type: "security", title: "New device sign-in", body: "Signed in from Chrome on Windows.", read: false, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
  { id: "n-3", type: "card", title: "Card used online", body: "Your virtual card •••• 4242 was used at Amazon for $42.18.", read: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
];

/* ============================================================
   Data access — real Supabase when configured, demo otherwise
   ============================================================ */

/** Row shapes (as consumed) for the Supabase queries below. */
interface AccountsRow {
  id: string;
  account_no: string;
  iban: string;
  swift_bic: string;
  currency: string;
  status: string;
  nickname: string | null;
  frozen: boolean;
  opened_at: string;
  products:
    | { name?: string; product_type?: string }
    | { name?: string; product_type?: string }[]
    | null;
  balances:
    | { ledger_balance?: string; available_balance?: string }
    | { ledger_balance?: string; available_balance?: string }[]
    | null;
}

interface PaymentOrderRow {
  id: string;
  tx_type: string;
  status: string;
  amount: string;
  currency: string;
  to_beneficiary_name: string;
  reference: string;
  order_no: string;
  narration: string;
  created_at: string;
}

interface CardsRow {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  status: string;
  frozen: boolean;
  online_enabled: boolean;
  daily_limit: string;
  name_on_card: string;
  account_id: string;
}

interface DepositsRow {
  id: string;
  principal: string;
  currency: string;
  interest_rate: string;
  term_days: number;
  start_date: string;
  maturity_date: string;
  interest_accrued: string;
  rollover: boolean;
  status: string;
}

interface ProductsRow {
  id: string;
  code: string;
  name: string;
  product_type: string;
  currency: string;
  interest_rate: string;
  min_opening_balance: string;
  monthly_fee: string;
  description: string;
}

interface NotificationsRow {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

export async function getAccounts(): Promise<AccountVM[]> {
  if (!isSupabaseConfigured()) return demoAccounts;
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("*, products(name, product_type), balances(ledger_balance, available_balance)")
    .order("created_at", { ascending: false });
  if (error || !data) return demoAccounts;
  return data.map((row: AccountsRow) => {
    const product = Array.isArray(row.products) ? row.products[0] : row.products;
    const balance = Array.isArray(row.balances) ? row.balances[0] : row.balances;
    return {
      id: row.id,
      accountNo: row.account_no,
      iban: row.iban ?? "",
      bic: row.swift_bic ?? "",
      productName: product?.name ?? "Account",
      productType: product?.product_type ?? "current",
      currency: row.currency,
      status: row.status,
      nickname: row.nickname,
      ledgerBalance: balance?.ledger_balance ?? "0",
      availableBalance: balance?.available_balance ?? "0",
      frozen: row.frozen,
      openedAt: row.opened_at,
    };
  });
}

export async function getAccount(id: string): Promise<AccountVM | null> {
  const accounts = await getAccounts();
  return accounts.find((a) => a.id === id) ?? null;
}

export async function getTransactions(accountId?: string): Promise<TransactionVM[]> {
  if (!isSupabaseConfigured()) {
    return accountId && accountId !== "acct-100" ? demoTransactions.slice(3) : demoTransactions;
  }
  const supabase = await getServerClient();
  let query = supabase.from("payment_orders").select("*").order("created_at", { ascending: false }).limit(50);
  if (accountId) query = query.eq("from_account_id", accountId);
  const { data, error } = await query;
  if (error || !data) return demoTransactions;
  return data.map((row: PaymentOrderRow) => ({
    id: row.id,
    txType: row.tx_type,
    status: row.status,
    amount: row.amount,
    currency: row.currency,
    direction: (row.tx_type === "deposit" || row.tx_type === "interest") ? "in" : "out",
    counterparty: row.to_beneficiary_name ?? "Capitech Bank",
    reference: row.reference ?? row.order_no,
    narration: row.narration,
    createdAt: row.created_at,
  }));
}

export async function getCards(): Promise<CardVM[]> {
  if (!isSupabaseConfigured()) return demoCards;
  const supabase = await getServerClient();
  const { data, error } = await supabase.from("cards").select("*").order("created_at", { ascending: false });
  if (error || !data) return demoCards;
  return data.map((row: CardsRow) => ({
    id: row.id,
    brand: row.brand,
    last4: row.last4,
    expMonth: row.exp_month,
    expYear: row.exp_year,
    status: row.status,
    frozen: row.frozen,
    onlineEnabled: row.online_enabled,
    dailyLimit: row.daily_limit,
    nameOnCard: row.name_on_card,
    accountId: row.account_id,
  }));
}

export async function getDeposits(): Promise<DepositVM[]> {
  if (!isSupabaseConfigured()) return demoDeposits;
  const supabase = await getServerClient();
  const { data, error } = await supabase.from("deposits").select("*").order("created_at", { ascending: false });
  if (error || !data) return demoDeposits;
  return data.map((row: DepositsRow) => ({
    id: row.id,
    principal: row.principal,
    currency: row.currency,
    interestRate: row.interest_rate,
    termDays: row.term_days,
    startDate: row.start_date,
    maturityDate: row.maturity_date,
    interestAccrued: row.interest_accrued,
    rollover: row.rollover,
    status: row.status,
  }));
}

export async function getProducts(): Promise<ProductVM[]> {
  if (!isSupabaseConfigured()) return demoProducts;
  const supabase = await getServerClient();
  const { data, error } = await supabase.from("products").select("*").eq("status", "active");
  if (error || !data) return demoProducts;
  return data.map((row: ProductsRow) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    productType: row.product_type,
    currency: row.currency,
    interestRate: row.interest_rate,
    minOpeningBalance: row.min_opening_balance,
    monthlyFee: row.monthly_fee,
    description: row.description,
  }));
}

export async function getNotifications(): Promise<NotificationVM[]> {
  if (!isSupabaseConfigured()) return demoNotifications;
  const supabase = await getServerClient();
  const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20);
  if (error || !data) return demoNotifications;
  return data.map((row: NotificationsRow) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    read: row.read,
    createdAt: row.created_at,
  }));
}

/** Total balance across accounts (converted to the base currency is Phase 2 — for now return per-currency totals). */
export function getTotalByCurrency(accounts: AccountVM[]): { currency: string; total: string }[] {
  const map = new Map<string, number>();
  for (const a of accounts) {
    map.set(a.currency, (map.get(a.currency) ?? 0) + Number(a.availableBalance));
  }
  return Array.from(map.entries()).map(([currency, total]) => ({
    currency,
    total: total.toFixed(2),
  }));
}

export { formatRelativeTime };

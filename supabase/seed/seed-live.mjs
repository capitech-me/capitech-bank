#!/usr/bin/env node
/* ============================================================
 * Capitech Bank — LIVE seed script (REST-based)
 * Run AFTER apply-all.sql has been executed in the SQL Editor:
 *
 *   NEXT_PUBLIC_SUPABASE_URL=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   node supabase/seed/seed-live.mjs
 *
 * Creates: profiles, retail + corporate customers, accounts
 * (USD/EUR/GBP), balances, cards, deposits, notifications.
 * ============================================================ */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://hekufxbeigxzkyfsqalx.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL;

if (!SERVICE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

/* --- minimal IBAN generator (mirror of @capitech/lib) --- */
function ibanCheckDigits(country, bban) {
  const rearranged = (bban + country + "00").split("").map((c) => (/[A-Z]/.test(c) ? c.charCodeAt(0) - 55 : c)).join("");
  let rem = 0n;
  for (let i = 0; i < rearranged.length; i += 7) {
    rem = (rem * 10000000n + BigInt(rearranged.slice(i, i + 7))) % 97n;
  }
  return String(98n - rem).padStart(2, "0");
}
function makeIban(country, accountNo) {
  const bban = ("CAPT" + accountNo + "0".repeat(18)).slice(0, 18);
  return country + ibanCheckDigits(country, bban) + bban;
}

/* --- demo identity --- */
const STAFF_EMAIL = "admin@capitech.me";
const CUSTOMER_EMAIL = "jane@capitech.me";
const CORP_OWNER_EMAIL = "corp@capitech.me";

async function findUser(email) {
  const { data, error } = await supabase.auth.admin.getUserByEmail(email);
  if (error) throw error;
  return data.user;
}

async function upsertProfile(user, { role, firstName, lastName }) {
  const { data: tenant } = await supabase.from("tenants").select("id").eq("slug", "capitech").single();
  const { error } = await supabase
    .from("profiles")
    .upsert(
      { id: user.id, tenant_id: tenant.id, role, first_name: firstName, last_name: lastName },
      { onConflict: "id" }
    );
  if (error) throw error;
  console.log(`profile ${role}: ${user.email}`);
}

async function main() {
  console.log("Seeding Capitech Bank demo environment…");

  const admin = await findUser(STAFF_EMAIL);
  const jane = await findUser(CUSTOMER_EMAIL);
  const corpOwner = await findUser(CORP_OWNER_EMAIL).catch(() => null);

  if (!admin || !jane) {
    console.error("Demo users missing. Create them first:");
    console.error("  admin@capitech.me  (staff_admin)");
    console.error("  jane@capitech.me   (customer)");
    console.error("Use: POST /auth/v1/admin/users with email_confirm:true");
    process.exit(1);
  }

  const { data: tenant } = await supabase.from("tenants").select("*").eq("slug", "capitech").single();
  const tenantId = tenant.id;
  console.log("tenant:", tenant.name, tenantId);

  await upsertProfile(admin, { role: "staff_admin", firstName: "Sarah", lastName: "Mitchell" });
  await upsertProfile(jane, { role: "customer", firstName: "Jane", lastName: "Doe" });
  if (corpOwner) await upsertProfile(corpOwner, { role: "corporate_admin", firstName: "Alex", lastName: "Turner" });

  /* --- retail customer + accounts --- */
  const { data: customer, error: cErr } = await supabase
    .from("customers")
    .upsert(
      {
        tenant_id: tenantId,
        profile_id: jane.id,
        customer_no: "CAP-000100",
        customer_type: "retail",
        kyc_level: "level_2",
        kyc_status: "approved",
        legal_first_name: "Jane",
        legal_last_name: "Doe",
        date_of_birth: "1990-04-12",
        nationality: "US",
        country_of_residence: "US",
        address_line1: "123 Market Street",
        city: "New York",
        risk_score: 10,
      },
      { onConflict: "customer_no" }
    )
    .select()
    .single();
  if (cErr) throw cErr;
  console.log("customer:", customer.customer_no);

  const { data: products } = await supabase.from("products").select("id, code, coa_account_id, currency");
  const byCode = Object.fromEntries(products.map((p) => [p.code, p]));

  async function upsertAccount(accountNo, productCode, currency, nickname, balance, country) {
    const product = byCode[productCode];
    const { data: existing } = await supabase.from("accounts").select("id").eq("account_no", accountNo).maybeSingle();
    if (existing) return existing.id;
    const { data: account, error } = await supabase
      .from("accounts")
      .insert({
        tenant_id: tenantId,
        account_no: accountNo,
        iban: makeIban(country, accountNo),
        swift_bic: `CAPT${country}XX`,
        product_id: product.id,
        coa_account_id: product.coa_account_id,
        owner_type: "customer",
        owner_id: customer.id,
        currency,
        status: "active",
        nickname,
        ledger_balance: balance,
        available_balance: balance,
      })
      .select()
      .single();
    if (error) throw error;
    console.log("account:", accountNo, currency, nickname);
    return account.id;
  }

  await upsertAccount("1002345678", "CUR_USD", "USD", "Everyday", 24580.42, "US");
  await upsertAccount("1008765432", "CUR_EUR", "EUR", "Travel", 12340.0, "US");
  await upsertAccount("2200112233", "SAV_USD", "GBP", "Rainy day", 8120.5, "GB");

  /* --- corporate demo (if owner exists) --- */
  if (corpOwner) {
    const { data: corpCustomer } = await supabase
      .from("customers")
      .upsert(
        {
          tenant_id: tenantId,
          profile_id: corpOwner.id,
          customer_no: "CAP-000200",
          customer_type: "corporate",
          kyc_level: "level_2",
          kyc_status: "approved",
          legal_name: "Acme Trading LLC",
          registration_number: "AE-88412",
          country_of_incorporation: "AE",
          industry: "Technology",
          risk_score: 28,
        },
        { onConflict: "customer_no" }
      )
      .select()
      .single();

    const { data: org } = await supabase
      .from("organizations")
      .upsert(
        {
          tenant_id: tenantId,
          customer_id: corpCustomer.id,
          legal_name: "Acme Trading LLC",
          registration_number: "AE-88412",
          country_of_incorporation: "AE",
          kyc_status: "approved",
          risk_score: 28,
        },
        { onConflict: ["tenant_id", "legal_name"] }
      )
      .select()
      .single();

    await supabase.from("organization_members").upsert({
      tenant_id: tenantId,
      organization_id: org.id,
      profile_id: corpOwner.id,
      role_title: "Managing Director",
      is_signatory: true,
      approval_threshold: 250000,
      status: "active",
    });

    const product = byCode["CORP_USD"];
    await supabase.from("accounts").insert({
      tenant_id: tenantId,
      account_no: "9900112233",
      iban: makeIban("AE", "9900112233"),
      swift_bic: "CAPTAEXX",
      product_id: product.id,
      coa_account_id: product.coa_account_id,
      owner_type: "organization",
      owner_id: org.id,
      currency: "USD",
      status: "active",
      nickname: "Operating",
      ledger_balance: 152340.9,
      available_balance: 152340.9,
    });
    console.log("corporate account: 9900112233 USD");
  }

  /* --- COA-side balances mirror --- */
  const { data: nostro } = await supabase.from("coa_accounts").select("id").eq("code", "1100").single();
  await supabase.from("balances").upsert([
    { tenant_id: tenantId, coa_account_id: nostro.id, currency: "USD", ledger_balance: 24580.42, available_balance: 24580.42 },
    { tenant_id: tenantId, coa_account_id: nostro.id, currency: "EUR", ledger_balance: 12340.0, available_balance: 12340.0 },
    { tenant_id: tenantId, coa_account_id: nostro.id, currency: "GBP", ledger_balance: 8120.5, available_balance: 8120.5 },
  ], { onConflict: "coa_account_id,currency" });

  /* --- cards --- */
  const { data: accounts } = await supabase.from("accounts").select("id, account_no").eq("owner_id", customer.id);
  const usdAccount = accounts.find((a) => a.account_no === "1002345678");
  await supabase.from("cards").upsert([
    { tenant_id: tenantId, account_id: usdAccount.id, customer_id: customer.id, brand: "visa", last4: "4242", token: `tok_${Math.random().toString(36).slice(2)}`, exp_month: 8, exp_year: 2030, status: "active", name_on_card: "JANE DOE", daily_limit: 2000 },
    { tenant_id: tenantId, account_id: usdAccount.id, customer_id: customer.id, brand: "mastercard", last4: "5518", token: `tok_${Math.random().toString(36).slice(2)}`, exp_month: 11, exp_year: 2029, status: "active", name_on_card: "JANE DOE", daily_limit: 500, frozen: true },
  ], { onConflict: ["account_id", "last4"] });
  console.log("cards: 2 virtual cards");

  /* --- deposits --- */
  const tdProduct = byCode["TD_USD"];
  await supabase.from("deposits").upsert([
    { tenant_id: tenantId, account_id: usdAccount.id, customer_id: customer.id, product_id: tdProduct.id, principal: 5000, currency: "USD", interest_rate: 4.25, term_days: 90, start_date: "2026-06-01", maturity_date: "2026-08-30", interest_accrued: 41.98, rollover: false, status: "active" },
    { tenant_id: tenantId, account_id: usdAccount.id, customer_id: customer.id, product_id: tdProduct.id, principal: 2500, currency: "EUR", interest_rate: 3.1, term_days: 180, start_date: "2026-03-15", maturity_date: "2026-09-11", interest_accrued: 37.56, rollover: true, status: "active" },
  ], { onConflict: ["account_id", "principal", "start_date"] });
  console.log("deposits: 2 term deposits");

  /* --- notifications --- */
  await supabase.from("notifications").insert([
    { tenant_id: tenantId, profile_id: jane.id, type: "transaction", title: "Payment received", body: "You received $350.00 from Amina Yusuf.", read: false },
    { tenant_id: tenantId, profile_id: jane.id, type: "security", title: "Welcome to Capitech Bank", body: "Your account is ready. Enable MFA for extra security.", read: false },
    { tenant_id: tenantId, profile_id: jane.id, type: "card", title: "Virtual card issued", body: "Your virtual card •••• 4242 is ready to use online.", read: false },
  ]);
  console.log("notifications: seeded");

  console.log("\n✅ Seed complete.");
  console.log("Sign in at http://localhost:3000/sign-in");
  console.log("  customer: jane@capitech.me / CapitechJane2026!");
  console.log("  staff:    admin@capitech.me / CapitechAdmin2026!");
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});

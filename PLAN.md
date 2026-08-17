# PLAN.md — Capitech Bank

> Maintained by HAKEM (PMO). Updated continuously as the build progresses.

## Status: Phase 1 ✅ · Phase 2 ✅ · Multi-zone restructure ✅ deployed (online.capitech.me) — security + functional remediation (S-1..S-10, M-1..M-5, F-1..F-3) implemented in repo; awaiting DNS + apply-hotfix5.sql paste + E2E run

## Live topology (single domain)
- **online.capitech.me** → landing (rewrites `/app/*` → customer, `/admin/*` → admin)
- customer app: basePath `/app` · admin app: basePath `/admin`
- Didit webhook retargeted → `https://online.capitech.me/app/api/webhooks/didit`
- Production deployments: landing `ondscbbnf` · customer `4t5wth5nh` · admin `d5s9h33e8` (stable aliases `capitech-{app}.vercel.app`)

## ⏳ Remaining to go live
1. **DNS**: `online.capitech.me → CNAME cname.vercel-dns.com` (or A 76.76.21.21) at registrar
2. **Paste `supabase/apply-hotfix5.sql`** — consolidated security+functional bundle (supersedes hotfix3/4: execute_payment v_fee_lines uuid + authz, execute_crypto_order gen_random_bytes + server-side pricing, post_journal auth.uid() ownership, RLS column guards, storage/audit fixes)
3. Resend: verify `capitech.me` sender domain (key works; DNS change also fixes this)
4. Re-run full-flow E2E (`pnpm test:e2e`, Playwright suite now in `e2e/`) → expect 34/34

## Live environment
- Supabase project: `hekufxbeigxzkyfsqalx` (connected, schema applied, seeded)
- Demo users: `admin@capitech.me` (staff_admin), `jane@capitech.me` (customer)
- **Didit KYC**: webhook destination registered (v3) · workflow `29395dea-3494-413e-a9b2-52333b177f79` · verified E2E

## Phase 2 (built, pending schema paste + deploy)
| Item | Status |
|------|--------|
| Emails — @capitech/email (Resend): welcome, KYC result, transfer, card, deposit, statement templates + triggers | ✅ built (needs RESEND_API_KEY) |
| Statements — PDF (pdf-lib) + CSV export + statements page | ✅ verified live |
| Open API — key mgmt, /api/open/v1 (accounts/transfers/webhooks), admin console, HMAC webhook dispatch | ✅ built (needs migration 0012 for key ownership) |
| Crypto — CoinGecko prices (live verified), buy/sell UI, wallets, order history | ✅ built (needs migration 0012 for execute_crypto_order) |

## ⏳ Next action
1. User pastes `supabase/apply-hotfix5.sql` (single consolidated bundle — security hardening + execute_payment/execute_crypto_order/post_journal fixes; supersedes apply-hotfix3.sql + apply-hotfix4.sql)
2. Run E2E suite (`pnpm test:e2e`, 34 cases) + fix any failures
3. Deploy Phase 2 + remediation to Vercel ×3 + verify (security headers, rate limits, admin proxy gating)
4. Then DNS change → capitech.me live

---

## Deliverables by phase

### Phase 1 — Core banking MVP
| # | Item | Status |
|---|------|--------|
| 1 | Monorepo (pnpm + turborepo) | ✅ done |
| 2 | Three Next.js 16 apps (landing / customer / admin) | ✅ done |
| 3 | Design system (@capitech/ui: theme, shadcn components, logo) | ✅ done |
| 4 | Shared lib (@capitech/lib: ISO 4217/3166, money, IBAN mod-97) | ✅ done |
| 5 | Landing page (hero, products, features, security, pricing, FAQ, contact) | ✅ done |
| 6 | Auth: sign-up / sign-in / MFA / forgot password / callback | ✅ done |
| 7 | Supabase schema: tenancy, profiles, KYC, COA, ledger engine, payments, cards, deposits, RLS, storage | ✅ done |
| 8 | Customer front office (dashboard, accounts, transfers, cards, deposits, crypto placeholder, notifications, profile) | ✅ done |
| 9 | Admin back office (overview, KYC queue, customers, accounts, ledger, approvals, products, staff, audit) | ✅ done |
| 10 | Vercel deploy configs (3 sites) | ✅ done |
| 11 | Connect real Supabase project (auth + RLS + storage) | ⏳ needs credentials |
| 12 | Seed demo users/accounts; end-to-end verification | ⏳ pending |

### Phase 2 — Crypto, Open API, real integrations
- [ ] Custodial crypto wallets + simulated market (CoinGecko prices)
- [ ] Open API: scoped API keys, endpoints, webhooks (ISO 20022-style)
- [ ] Real payment rails + card issuer swap-in
- [ ] Transactional emails (Resend) + notification center
- [ ] Statements (PDF/CSV) + advanced reports

### Phase 3 — Production hardening
- [ ] Penetration testing, dependency audits
- [ ] SOC2/ISO27001-style readiness docs, real licensing consultation
- [ ] Rate limiting, WAF, monitoring (Sentry, uptime)
- [ ] Backup/DR drills, incident runbooks

---

## Open decisions / requests for user
1. **Supabase project URL + anon key** (and optionally service role key) → paste into the three `.env.local` files (I'll wire end-to-end and apply migrations).
2. Confirm base settlement country for IBAN generation (currently tenant country, default `AE`).
3. Phase 2 kickoff after Phase 1 verification.

---

## Architecture decisions (locked)
- Next.js 16 App Router + Turbopack (Vercel runtime)
- Tailwind CSS v4 + vendored tw-animate-css (exports-map workaround)
- Single write path: `post_journal()` SECURITY DEFINER (double-entry, no overdraft)
- Maker–checker on payment execution; SCA tokens reserved
- Multi-tenant via `tenant_id` + RLS on every table
- Demo-mode fallback data layer so UI is explorable without Supabase

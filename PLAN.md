# PLAN.md — Capitech Bank

> Maintained by HAKEM (PMO). Updated continuously as the build progresses.

## Status: Full platform live ✅ — landing + customer + admin deployed on `online.capitech.me`, security hardened, crypto live (Alpha Vantage), all major bank features built

## Live topology (single domain)
- **online.capitech.me** → landing (rewrites `/app/*` → customer, `/admin/*` → admin)
- customer app: basePath `/app` · admin app: basePath `/admin`
- Didit webhook retargeted → `https://online.capitech.me/app/api/webhooks/didit`
- Production deployments: landing `ondscbbnf` · customer `4t5wth5nh` · admin `d5s9h33e8` (stable aliases `capitech-{app}.vercel.app`)

## ✅ What's live
- **Landing**: hero, products, features, security, pricing, FAQ, real contact form (`/contact` → routes to `/admin/contact` inbox)
- **Customer front office**: dashboard, accounts, transfers, cards, deposits, crypto (Alphavantage LIVE), statements (PDF/CSV), notifications, profile, **FX convert** (`/app/convert`), **standing orders** (`/app/standing-orders`), **corporate team** (`/app/team`), **help** (`/app/help`), external SWIFT/SEPA transfers
- **Admin back office**: overview, KYC queue + onboarding doc viewer, customers, accounts, ledger, payment approvals (maker–checker), **products CRUD editor**, **reports** (`/admin/reports` — Balance Sheet + P&L), **webhooks** (`/admin/webhooks` — endpoints + delivery log + API usage), **contact inbox** (`/admin/contact`), Open API key mgmt, staff, audit
- **Open API**: key mgmt, `/api/open/v1` (accounts/transfers/webhooks), HMAC webhook dispatch
- **Crypto**: live Alpha Vantage prices, buy/sell, wallets, orders — settles through the ledger
- **Card controls** (Phase 3): online/ATM/contactless toggles + per-card limits
- **Deposits** (Phase 3): interest accrual + maturity countdown
- **Notifications** (Phase 3): per-channel preference toggles
- **Emails** (Resend): welcome, KYC result, transfer, card, deposit, statement, invite templates
- **Security**: S-1..S-10, M-1..M-5, F-1..F-3 remediation applied (superseded by consolidated `apply-hotfix5.sql`)
- **Monitoring** (Phase 4): Sentry error tracking wired into all three apps
- **PWA** (Phase 4): manifest + icons on landing, customer, and admin apps
- All zones deployed & verified on `online.capitech.me`

## 🗺️ Future / roadmap (optional)
- Real payment rails (e.g. SWIFT/SEPA/ACH via a provider) + card issuer swap-in
- Native mobile app (React Native / Expo)
- Production licensing, SOC2/ISO27001-style readiness docs, penetration testing

## Live environment
- Supabase project: `hekufxbeigxzkyfsqalx` (connected, schema applied, seeded)
- Demo users: `admin@capitech.me` (staff_admin), `jane@capitech.me` (customer)
- **Didit KYC**: webhook destination registered (v3) · workflow `29395dea-3494-413e-a9b2-52333b177f79` · verified E2E

## Databases / migrations
- Schema now at **0017** with **0018** pending:
  - **0014** `org_member_management` · **0015** `fx_and_external` · **0016** `notification_prefs` · **0017** `contact_messages` (the 4 new)
  - **0018** `standing_order_cron` (about to be created) — the "+1"
- Consolidated paste bundle: **`supabase/apply-phase2-4.sql`** (supersedes the individual Phase 2–4 pieces)

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
| 8 | Customer front office (dashboard, accounts, transfers, cards, deposits, crypto, notifications, profile) | ✅ done |
| 9 | Admin back office (overview, KYC queue, customers, accounts, ledger, approvals, products, staff, audit) | ✅ done |
| 10 | Vercel deploy configs (3 sites) | ✅ done |
| 11 | Connect real Supabase project (auth + RLS + storage) | ✅ done |
| 12 | Seed demo users/accounts; end-to-end verification | ✅ done |

### Phase 2 — Crypto, Open API, real integrations
| Item | Status |
|------|--------|
| Custodial crypto wallets + live market (Alpha Vantage) | ✅ done |
| FX conversion (`/app/convert`, `convert_currency`) | ✅ done |
| Open API: scoped API keys, endpoints, webhooks (ISO 20022-style) | ✅ done |
| External SWIFT/SEPA transfers | ✅ done |
| Real payment rails + card issuer swap-in | ⏳ optional / future |
| Transactional emails (Resend) + notification center | ✅ done |
| Statements (PDF/CSV) + advanced reports (Balance Sheet + P&L) | ✅ done |
| Corporate team members (`/app/team`, member invites) | ✅ done |
| Standing orders (`/app/standing-orders`) | ✅ done |
| Admin webhooks console (endpoints + delivery log + API usage) | ✅ done |
| Admin onboarding KYC doc viewer + products CRUD editor | ✅ done |

### Phase 3 — Production hardening
| Item | Status |
|------|--------|
| Card controls (online/ATM/contactless/limits) | ✅ done |
| Deposit interest accrual + maturity countdown | ✅ done |
| Notification preferences | ✅ done |
| Real contact form (`/contact`) + admin contact inbox (`/admin/contact`) | ✅ done |
| Penetration testing, dependency audits | ⏳ optional |
| SOC2/ISO27001-style readiness docs, real licensing consultation | ⏳ optional |
| Rate limiting, WAF, monitoring | ✅ rate limiting + monitoring; WAF ⏳ optional |
| Backup/DR drills, incident runbooks | ⏳ optional |

### Phase 4 — Observability & PWA
| Item | Status |
|------|--------|
| Sentry error tracking (landing / customer / admin) | ✅ done |
| PWA manifests + icons (3 apps) | ✅ done |

---

## Open decisions / requests for user
- **Resolved**: Supabase project connected · crypto wired to Alpha Vantage · zone deployment complete · Didit KYC E2E verified · security remediation applied.
- **Remaining**: Production licensing consultation (optional / future). Nothing blocks the current live platform.

---

## Architecture decisions (locked)
- Next.js 16 App Router + Turbopack (Vercel runtime)
- Tailwind CSS v4 + vendored tw-animate-css (exports-map workaround)
- Single write path: `post_journal()` SECURITY DEFINER (double-entry, no overdraft)
- Maker–checker on payment execution; SCA tokens reserved
- Multi-tenant via `tenant_id` + RLS on every table
- Demo-mode fallback data layer so UI is explorable without Supabase

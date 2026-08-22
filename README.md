# Capitech Bank

Full-fledged digital banking platform — multi-currency accounts, virtual & physical
cards, term deposits, custodial crypto, double-entry core banking, Open API,
multi-tenant back & front offices, and retail + corporate onboarding with KYC/KYB.

> **Live:** [online.capitech.me](https://online.capitech.me) — landing · customer app
> (`/app`) · back office (`/admin`)
>
> **Try it:** click **"Try demo"** on the landing page for instant customer-app access.

---

## ✨ Feature overview

### 🏦 Core banking
- Multi-currency accounts (30+ currencies, ISO 4217) with real IBANs (ISO 13616 / mod-97)
- Double-entry **`post_journal()`** write path — balanced journals, no overdraft
- IFRS-aligned chart of accounts, ledger engine, SCA tokens, pg_cron jobs
- Instant P2P transfers with **maker–checker** approvals
- Virtual & physical cards — per-card limits, freeze/unfreeze, PCI-style tokenisation
- Term deposits with interest accrual and auto-rollover
- Statements export (PDF via pdf-lib + CSV)

### 📈 Crypto (LIVE)
- Custodial crypto wallets (BTC, ETH, SOL, USDT + 20+ more)
- Live prices from **Alpha Vantage** (cache-first, quota-friendly round-robin refresh)
- Buy / sell / convert with bank-grade custody simulation

### 🆔 Onboarding & KYC/KYB (Didit)
- 3-step sign-up wizard capturing full **KYC** (personal) / **KYB** (business) data
- **Didit** identity verification: ID scan + selfie + liveness (SDK modal)
- **KYB** company registry check, AML screening, key-people verification
- HMAC-SHA256 webhook with timestamp freshness + event idempotency
- Onboarding auto-prefills from sign-up metadata — no re-entry

### 🔌 Open API (ISO 20022-style)
- Scoped API keys with expiry + revocation
- `/api/open/v1` — accounts, transfers, webhook registration
- HMAC-signed webhook dispatch with SSRF protection
- Admin key-management console

### 🔐 Security
- Row-level security on every table, multi-tenant isolation
- Server-side price re-pricing (no client-controlled oracle)
- Rate limiting on auth/verify/email/webhook/Open API endpoints
- CSP + security headers, session-refresh proxies, staff-gated back office
- Full audit trail in the back office

### 🛡️ Back office (admin)
- KPI overview · KYC/KYB queue · customers · accounts · general ledger
- Payment approvals (maker–checker) · products · Open API console · staff · audit

---

## 🧱 Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase
(Postgres, Auth + MFA, Storage, Realtime) · Vercel · pnpm · Turborepo

**Integrations:** Didit (KYC/KYB) · Alpha Vantage (crypto prices) · Resend
(transactional email + Supabase SMTP) · Vercel Analytics & Speed Insights

---

## 📁 Monorepo layout

```
apps/
  landing/    # Marketing site + 3-step sign-up + auth     → online.capitech.me
  customer/   # Front office — customer banking portal     → online.capitech.me/app
  admin/      # Back office — operations console           → online.capitech.me/admin
packages/
  ui/         # Design system: brand theme, shadcn-style components
  db/         # Supabase clients, rate limiter, types
  email/      # Resend transactional email templates
  lib/        # Money, IBAN/mod-97, ISO 4217, ISO 3166, constants
  openapi/    # Open API auth, SSRF guard, webhook dispatch
supabase/
  migrations/ # Core banking schema (tenancy → ledger → payments → cards → deposits → RLS → hardening)
  seed/       # Demo data
e2e/          # Playwright end-to-end suite (34 tests)
```

---

## 🚀 Quick start

```bash
pnpm install
pnpm dev            # landing :3006 · customer :3001 · admin :3002
```

Copy `.env.local.example` → `.env.local` in each app and add your credentials:

| Var | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | all apps | Supabase DB + Auth |
| `SUPABASE_SERVICE_ROLE_KEY` | all apps (server-only) | Admin DB ops |
| `DIDIT_API_KEY` / `DIDIT_WEBHOOK_SECRET` | customer | KYC/KYB verification |
| `ALPHAVANTAGE_API_KEY` | customer | Crypto live prices |
| `RESEND_API_KEY` / `EMAIL_FROM` | all apps | Transactional email |

**Demo mode:** without Supabase credentials the apps run on curated demo data so
every screen is explorable.

---

## 🧪 Testing

```bash
pnpm test:e2e            # 34-test Playwright suite (boots all 3 apps)
pnpm lint && pnpm typecheck
```

**CI (GitHub Actions):** lint + typecheck + build on every push to `master`; the
Playwright E2E suite runs manually (`workflow_dispatch`).

---

## 📜 Standards modelled

ISO 4217 currencies · ISO 3166 countries · IBAN (ISO 13616 / ECBS) · SWIFT/BIC ·
double-entry bookkeeping · IFRS-aligned COA · KYC/AML (CDD, PEP flags, risk
scoring) · maker–checker · PCI-DSS-style card tokenisation · PSD2-style SCA

---

> **Disclaimer:** This is a software demonstration platform. All services are
> simulated in a sandbox and do not constitute real financial services or advice.

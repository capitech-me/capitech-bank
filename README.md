# Capitech Bank

Full-fledged digital banking platform — multi-currency accounts, virtual cards, term
deposits, double-entry core banking, Open API (phase 2), multi-tenant back & front
offices, retail + corporate onboarding.

**Stack**: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
Supabase (Postgres, Auth+MFA, Storage, Realtime, Edge Functions) · Vercel · pnpm ·
Turborepo

**Domain**: `capitech.me` (landing) · `app.capitech.me` (customer) · `admin.capitech.me` (back office)

---

## Monorepo layout

```
apps/
  landing/    # Marketing site + auth (sign up / sign in / MFA)   → capitech.me
  customer/   # Front office — customer banking portal            → app.capitech.me
  admin/      # Back office — operations console                  → admin.capitech.me
packages/
  ui/         # Design system: brand theme, shadcn-style components
  db/         # Supabase clients, database types, zod validation
  lib/        # Money, IBAN/mod-97, ISO 4217, ISO 3166, constants
supabase/
  migrations/ # Core banking schema (tenancy → ledger → payments → cards → deposits → RLS)
  seed/       # Demo data
  config.toml # Local dev config
```

## Quick start

```bash
pnpm install
pnpm dev            # landing :3000 · customer :3001 · admin :3002
```

Then copy `.env.local.example` → `.env.local` in each app and add your Supabase
credentials (see `supabase/README.md` for the full setup).

**Demo mode**: without Supabase credentials the apps run against a curated demo data
layer so every screen is explorable — auth, transfers and card actions gracefully
fall back to simulated success.

## What's built (Phase 1 — core banking MVP)

- Landing page: hero, products (Personal/Business/Corporate/Crypto/Cards/Deposits/Open API),
  features, security, pricing, FAQ, contact
- Auth: sign up (retail/corporate), sign in, TOTP MFA, password reset, session refresh proxy
- Front office: dashboard with per-currency balances, accounts + IBAN detail, transfers,
  virtual cards (create/freeze/limits), term deposits, notifications, profile & MFA
- Back office: KPI overview, KYC queue with approve/reject, customers, accounts,
  general ledger (chart of accounts + journals), payment approvals (maker–checker),
  products, staff & roles, audit trail
- Core banking schema: multi-tenant, double-entry `post_journal()` write path,
  IFRS-aligned chart of accounts, IBAN/mod-97 generation, SCA tokens, pg_cron jobs
- Security: RLS on every table, tokenised cards (last4 only), staff-only back office
- **Didit KYC**: server-side session creation (`/api/verify`), HMAC-SHA256 webhook with
  timestamp freshness + event idempotency (`/api/webhooks/didit`), status state machine
  (Approved/Declined/In Review/Resubmitted/Kyc Expired → customers + notifications),
  in-app SDK modal with consent, ISO 13616 IBANs

## Phase 2 roadmap

Crypto (custodial simulation + live prices) · Open API (keys, webhooks, ISO 20022-style
messages) · real payment/card providers · transactional email (Resend) · statements export

## Standards modelled

ISO 4217 currencies · ISO 3166 countries · IBAN (ISO 13616 / ECBS) · SWIFT/BIC ·
double-entry bookkeeping · IFRS-aligned COA · KYC/AML (CDD, PEP flags, risk scoring) ·
maker–checker · PCI-DSS-style card tokenisation · PSD2-style SCA

---

> **Disclaimer**: This is a software demonstration platform. All services are simulated
> in a sandbox and do not constitute real financial services or advice.

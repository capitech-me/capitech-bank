# PLAN.md — Capitech Bank

> Maintained by HAKEM (PMO). Updated continuously as the build progresses.

## Status: Phase 1 — UI complete ✅ · Schema complete ✅ · Live Supabase connected ✅ · Awaiting schema apply (SQL Editor paste) then seed + end-to-end verification.

## Live environment
- Supabase project: `hekufxbeigxzkyfsqalx` (connected, keys verified)
- Demo users created (Auth API): `admin@capitech.me` (staff_admin), `jane@capitech.me` (customer)
- Next: user pastes `supabase/apply-all.sql` in the SQL Editor → then run `seed-live.mjs` → verify E2E

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
| 10 | Netlify deploy configs (3 sites) | ✅ done |
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
- Next.js 16 App Router + Turbopack (Netlify runtime)
- Tailwind CSS v4 + vendored tw-animate-css (exports-map workaround)
- Single write path: `post_journal()` SECURITY DEFINER (double-entry, no overdraft)
- Maker–checker on payment execution; SCA tokens reserved
- Multi-tenant via `tenant_id` + RLS on every table
- Demo-mode fallback data layer so UI is explorable without Supabase

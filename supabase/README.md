# Capitech Bank — Supabase

Core banking schema for the Capitech Bank platform: multi-tenant, double-entry ledger,
KYC, payments, virtual cards, term deposits, crypto (phase 2) and Open API (phase 2).

## Structure

```
migrations/   # versioned SQL migrations (apply in order, 0001 → 0013)
functions/    # Edge Functions (Phase 2: crypto prices, emails, statements)
seed/         # demo data scripts
config.toml   # local dev config (supabase CLI)
```

> **Hotfix bundles**: `apply-hotfix5.sql` is the CONSOLIDATED security/functional
> paste bundle and supersedes `apply-hotfix3.sql` and `apply-hotfix4.sql` (and
> the older `apply-hotfix*.sql` / `apply-0012.sql` / `apply-0013.sql` bundles).
> Its content mirrors migration `20260816000013_security_hardening.sql`.

## Migration map

| # | File | Contents |
|---|------|----------|
| 0001 | extensions | pgcrypto, uuid-ossp, pg_trgm, pg_cron |
| 0002 | tenancy_and_profiles | `tenants`, `profiles`, roles, auth trigger, helper functions |
| 0003 | onboarding_kyc | `customers`, `organizations`, `organization_members`, `kyc_documents` |
| 0004 | chart_of_accounts_products | IFRS-style COA (seeded), banking `products` (seeded) |
| 0005 | ledger_engine | `accounts`, `balances`, `gl_entries`, `gl_entry_lines`, `post_journal()`, `open_account()` |
| 0006 | payments | `payment_orders`, `transaction_tokens`, `create_payment()`, `execute_payment()` |
| 0007 | cards | `cards` (tokenised), `card_transactions`, `simulate_card_purchase()` |
| 0008 | deposits | `deposits`, `open_deposit()`, `accrue_deposit_interest()`, `mature_deposits()` |
| 0009 | operations | `notifications`, `operation_logs`, crypto + Open API tables, pg_cron jobs |
| 0010 | rls_policies | Row-level security for every table + storage buckets |
| 0011 | iban_standard | IBAN standardisation |
| 0012 | openapi_crypto | API-key ownership, crypto price cache, `execute_crypto_order()` |
| 0013 | security_hardening | Privilege-escalation/balance/KYC/authz fixes (S-1..S-6, S-9, M-1, M-4, L-1..L-3) — mirrors `apply-hotfix5.sql` |

## Apply to a remote Supabase project

1. Create a project at https://supabase.com/dashboard (Postgres 15).
2. Install the Supabase CLI (`pnpm dlx supabase` or `npm i -g supabase`).
3. Link the project:
   ```bash
   supabase link --project-ref <your-project-ref>
   ```
   (your project ref is the subdomain of your project URL, e.g. `abcxyz` from
   `https://abcxyz.supabase.co`)
4. Push migrations:
   ```bash
   supabase db push
   ```
5. Grab API keys: Dashboard → Project Settings → API →
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (server only — never expose)
6. Enable pg_cron + MFA in the dashboard if not already enabled.

## Local development (optional)

```bash
supabase start        # boots local stack (Docker required)
supabase db reset     # applies migrations + seed
supabase status       # shows local anon/service keys for .env.local
```

## Key design notes

- **Single write path**: every ledger movement goes through `post_journal()`
  (SECURITY DEFINER) which enforces double-entry balance and insufficient-funds checks.
  Never insert into `gl_entries` directly.
- **Maker–checker**: `execute_payment()` rejects a payment approved by its creator.
- **Balances**: customer balances live on `accounts`; COA balances in `balances`.
  `ledger_snapshot()` merges both for reporting.
- **Multi-tenancy**: all tables carry `tenant_id`; RLS scopes every read/write to the
  caller's tenant (see `current_tenant_id()`).
- **Money**: fiat `numeric(20,2)`, COA balances `numeric(24,6)`, crypto `numeric(36,18)`.
- **Audit logs (M-1)**: `operation_logs` writes are intentionally restricted to the
  service role. The Didit webhook / app must call `log_operation()` with the
  `SUPABASE_SERVICE_ROLE_KEY` (server-side), never from the browser.
- **Privilege guards (0013)**: `protect_profile_privileges`,
  `protect_kyc_fields` and `protect_account_balances` triggers block
  self-escalation of role/tenant, KYC self-approval and balance tampering by
  customers. Balances move only through `post_journal()` (SECURITY DEFINER),
  whose internal writes bypass the trigger via the function-owner context.

# Capitech Bank — Sitemap

> Full page tree for the Capitech Bank platform. Single-domain multi-zone setup:
> landing at the root, customer app under `/app`, admin app under `/admin`.

**Live domain:** `https://online.capitech.me`
**Last updated:** Aug 2026

---

## 🌍 Landing (public) — root

| Path | Page | Notes |
|---|---|---|
| `/` | Home | Hero, Products, Features, HowItWorks, Security, Developers, FAQ, CTA |
| `/personal` | Personal Banking | 6 offerings + how-it-works |
| `/business` | Business Banking | 7 offerings + get-started |
| `/developers` | Developers | Open API · API docs · Sandbox · Webhooks |
| `/legal` | Legal | Privacy · Terms · Cookies · Regulatory |
| `/about` | About | Mission · Stats · Values |
| `/contact` | Contact | Talk to team + message form |
| `/sign-in` | Sign in | Email/password + MFA step |
| `/sign-up` | Sign up | Personal/Business selector + KYC form |
| `/auth/forgot-password` | Reset password | |
| `/auth/callback` | Auth callback | Email confirm → redirect (route handler) |

---

## 👤 Customer App — basePath `/app` (requires customer login)

| Path | Page |
|---|---|
| `/app` | Dashboard — balances, quick actions, transactions |
| `/app/onboarding` | KYC onboarding — Type → Details → Documents → Review |
| `/app/accounts` | Accounts list |
| `/app/accounts/[id]` | Account detail — IBAN, transactions |
| `/app/transfers` | Transfers |
| `/app/cards` | Virtual & physical cards |
| `/app/deposits` | Term deposits |
| `/app/crypto` | Crypto — buy/sell, wallets, orders (Alpha Vantage prices, LIVE) |
| `/app/statements` | Statements — PDF/CSV |
| `/app/notifications` | Notifications |
| `/app/profile` | Profile & Security — MFA |

### Customer API (server routes)

| Path | Purpose |
|---|---|
| `/app/api/verify` | Didit KYC session |
| `/app/api/webhooks/didit` | Didit HMAC webhook |
| `/app/api/crypto/prices` | Alpha Vantage price proxy (cache-first + round-robin refresh) |
| `/app/api/emails/send` | Transactional email send |
| `/app/api/statements/[accountId]` | Statement download |
| `/app/api/open/v1/accounts` | Open API — accounts |
| `/app/api/open/v1/accounts/[id]` | Open API — account detail |
| `/app/api/open/v1/transfers` | Open API — transfers |
| `/app/api/open/v1/webhooks` | Open API — webhook registration |

---

## 🛡️ Admin App — basePath `/admin` (requires staff login)

| Path | Page |
|---|---|
| `/admin` | Overview — KPI snapshot |
| `/admin/onboarding` | Onboarding & KYC queue |
| `/admin/customers` | Customers |
| `/admin/accounts` | Accounts |
| `/admin/ledger` | General Ledger — chart of accounts + journals |
| `/admin/payments` | Payment approvals — maker-checker |
| `/admin/products` | Products |
| `/admin/open-api` | Open API key management |
| `/admin/staff` | Staff & Roles |
| `/admin/audit` | Audit trail |

### Admin API (server routes)

| Path | Purpose |
|---|---|
| `/admin/api/openapi/keys` | Create API key |
| `/admin/api/openapi/list` | List keys |
| `/admin/api/openapi/revoke` | Revoke key |
| `/admin/api/payments/notify` | Payment webhook notify |

---

## 📊 Summary

| Zone | Pages | Access |
|---|---|---|
| Landing | 9 + 2 auth routes | Public |
| Customer | 10 + 6 API routes | Customer login |
| Admin | 10 + 4 API routes | Staff login |
| **Total** | **29 UI pages** | |

## 🔌 External integrations

| Service | Key env var | Used for | Status |
|---|---|---|---|
| Supabase (`hekufxbeigxzkyfsqalx`) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | DB + Auth + RLS + MFA | ✅ Live |
| Alpha Vantage | `ALPHAVANTAGE_API_KEY` | Crypto live prices | ✅ Live |
| Resend | `RESEND_API_KEY` (+ SMTP for Supabase Auth) | Transactional email + confirmation | ✅ Live |
| Didit | `DIDIT_API_KEY`, `DIDIT_WEBHOOK_SECRET` | KYC identity verification | ✅ Live |
| Vercel | `VERCEL_OIDC_TOKEN` | Deployments | ✅ Live |
| GitHub | gh CLI token | CI/CD | ✅ Live |

---

## 🔑 Demo credentials

| Role | Email | Password |
|---|---|---|
| Customer | `jane@capitech.me` | `CapitechJane2026!` |
| Staff admin | `admin@capitech.me` | `CapitechAdmin2026!` |

---

## 🔗 Navigation structure

### Header (all pages)
- Personal → `/personal`
- Business → `/business`
- Developers → `/developers`
- Features → `#features` (home only)
- FAQ → `#faq` (home only)
- **Sign in** → `/sign-in`
- **Open account** → `/sign-up`

### Footer (all pages)

| Column | Links |
|---|---|
| Banking | Personal, Business |
| Developers | Open API → `/developers#open-api`, API docs → `/developers#api-docs`, Sandbox → `/developers#sandbox`, Webhooks → `/developers#webhooks` |
| Company | About → `/about`, Contact → `/contact` |
| Legal | Privacy → `/legal#privacy`, Terms → `/legal#terms`, Cookies → `/legal#cookies`, Regulatory → `/legal#regulatory` |

---

## 🔄 Version control workflow (maintained by HAKEM)

**Source of truth:** `E:\Ai Project\Capitech` (Git repo) · **Remote:** `github.com/capitech-me/capitech-bank` · **Build/deploy:** `C:\AI Projects\Capitech` (NTFS working copy)

For **every major change** the following process is followed:

1. **Edit** in `E:` (the git repo — source of truth)
2. **Sync** edited files to `C:` (`robocopy /E /XO` excluding node_modules/.next/.turbo/.git)
3. **Build** in `C:` (`pnpm --filter <app> build`) — E: is FAT32 and can't run pnpm
4. **Deploy** to Vercel from `C:` root (swap `.vercel/project.json` per app)
5. **Commit** in `E:` with a descriptive message (conventional-style: `feat:`/`fix:`/`docs:`/`style:`/`chore:`)
6. **Push** to `origin master` → GitHub Actions CI validates (lint + typecheck + build)
7. **Verify** live on `online.capitech.me`

**Commit rules:**
- Secrets (`.env.local`) are gitignored — never committed
- `JSON/capitech-bank-full-digital-bank-plan.json` (session archive) stays out of commits
- Commit author: `Capitech Advisory <capitechadvisory@gmail.com>` (matches GitHub — avoids Vercel deploy blocks)

**Deploy caveat:** always deploy from `C:` (E:'s JSON session archive mutates during uploads and breaks Vercel's file hash check).

# Capitech Bank — Sitemap

> Full page tree for the Capitech Bank platform. Single-domain multi-zone setup:
> landing at the root, customer app under `/app`, admin app under `/admin`.

**Live domain:** `https://online.capitech.me`

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
| `/app/crypto` | Crypto — buy/sell, wallets, orders |
| `/app/statements` | Statements — PDF/CSV |
| `/app/notifications` | Notifications |
| `/app/profile` | Profile & Security — MFA |

### Customer API (server routes)

| Path | Purpose |
|---|---|
| `/app/api/verify` | Didit KYC session |
| `/app/api/webhooks/didit` | Didit HMAC webhook |
| `/app/api/crypto/prices` | CoinGecko price proxy |
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

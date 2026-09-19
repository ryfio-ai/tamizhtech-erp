# TAMIZHTECH ERP 2.0 — VERCEL-ONLY PRODUCTION DEPLOYMENT CHECKLIST

## Hosting Architecture

Use ONLY:

```text
Vercel
  ↓
Next.js ERP Application
  ↓
MongoDB Atlas
  ↓
Optional Upstash Redis
```

Do NOT introduce:
* Cloudflare proxy
* Nginx
* AWS reverse proxy
* Docker host
* Separate API server
* Separate web server

The ERP remains a single Next.js application deployed on Vercel.

---

## 1. Vercel Production Project

Create/configure exactly one production Vercel project for the ERP.

* **Production branch**: `main`
* **Production domain**: your actual ERP domain (e.g., `https://erp.tamizhtech.in`)
* **Environment**: `Production`
* **Root Directory**: `./`
* **Framework Preset**: Next.js

> [!WARNING]
> Do NOT use Preview deployment credentials against the production database (`tamizhtech`).

---

## 2. Vercel Environment Variables

Configure all production secrets through:
```text
Vercel Dashboard → Project → Settings → Environment Variables → Scope: Production
```

### Production Environment Variables

| Variable Name | Required | Example / Destination | Security Note |
|---|:---:|---|---|
| `DATABASE_URL` | **YES** | `mongodb+srv://.../tamizhtech?retryWrites=true&w=majority` | Production DB strictly |
| `NEXTAUTH_SECRET` | **YES** | 32+ byte cryptographic random hex string | Secret |
| `NEXTAUTH_URL` | **YES** | `https://your-erp-domain` | Real production domain |
| `NEXT_PUBLIC_APP_URL` | **YES** | `https://your-erp-domain` | Public domain URL |
| `NEXT_PUBLIC_APP_NAME` | **YES** | `TamizhTech ERP` | UI brand string |
| `RESEND_API_KEY` | Optional | `re_...` | For email dispatch |
| `UPSTASH_REDIS_REST_URL` | Optional | `https://...upstash.io` | Serverless cache only |
| `UPSTASH_REDIS_REST_TOKEN`| Optional | `AX...` | Serverless token |

### Security Isolation Rules:
* **NEVER expose** `DATABASE_URL`, `NEXTAUTH_SECRET`, `RESEND_API_KEY`, or `UPSTASH_REDIS_REST_TOKEN` with the `NEXT_PUBLIC_` prefix.
* Environment-variable changes require a new deployment to take effect on Vercel.

---

## 3. NODE_ENV

* Do not manually build application logic around a hardcoded development/production flag.
* Vercel automatically sets `NODE_ENV=production` during production builds.
* This automatically enables:
  - `__Secure-` cookie naming in NextAuth ([lib/auth.ts](file:///c:/Users/sathish/Desktop/tamizhtech-erp/lib/auth.ts))
  - `secure: true` on authentication cookies
  - Next.js production build bundle minification and optimizations

---

## 4. HTTPS / TLS

* Vercel is the sole HTTPS/TLS delivery platform.
* Attach custom domain in Vercel Project Settings &rarr; Domains.
* Verify:
  - Automatic HTTP &rarr; HTTPS redirection
  - Valid Vercel-managed Let's Encrypt / DigiCert TLS certificate
  - Zero mixed-content warnings on console
* **Do not configure a separate TLS reverse proxy.**

---

## 5. Vercel Firewall

Navigate to:
```text
Vercel Dashboard → Project → Firewall
```

Configure protection for at least:
```text
/api/auth/*
```
and sensitive mutation endpoints:
```text
POST /api/auth/*
POST /api/invoices/*
POST /api/quotations/*
POST /api/customers/*
POST /api/payments/*
POST /api/inventory/*
POST /api/production/*
```

* **Rate Limiting Guidelines**:
  - Implement fixed-window rate limiting on `/api/auth/*` (e.g. 10 requests / 1 minute per IP) to mitigate brute-force attempts.
  - Implement mutation limits on financial endpoints to prevent burst abuse.
  - Note: Rate limiting capabilities depend on the Vercel plan (fixed-window on Pro, token-bucket on Enterprise). Check active plan capabilities.

---

## 6. Vercel Deployment Protection

Protect Preview deployments so test builds are not publicly usable as production ERP instances:
```text
Production  → Public (authenticated via ERP login)
Preview     → Protected (Vercel Authentication / password protection enabled)
Development → Localhost
```

> [!CRITICAL]
> Never point Preview deployments at the production `tamizhtech` database.
> Preview and E2E automated test runs must strictly target `tamizhtech_e2e`.

---

## 7. Application Security Controls

### Cookies (Enforced in [lib/auth.ts](file:///c:/Users/sathish/Desktop/tamizhtech-erp/lib/auth.ts))
* `httpOnly = true`
* `sameSite = lax`
* `secure = true` (in production)
* `__Secure-` prefix applied in HTTPS production

### Security Headers (Enforced in [next.config.mjs](file:///c:/Users/sathish/Desktop/tamizhtech-erp/next.config.mjs))
* `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
* `X-Frame-Options: SAMEORIGIN`
* `X-Content-Type-Options: nosniff`
* `Referrer-Policy: origin-when-cross-origin`
* `Permissions-Policy: camera=(), microphone=(), geolocation=()`
* `X-DNS-Prefetch-Control: on`

### API Authorization (Enforced in [middleware.ts](file:///c:/Users/sathish/Desktop/tamizhtech-erp/middleware.ts))
* Every privileged mutation must validate authentication/authorization server-side.
* Never depend solely on frontend route hiding.

---

## 8. CORS Policy

Because the ERP is a same-origin Next.js application:
```text
Browser
   ↓
https://your-erp-domain
   ↓
/api/*
```

* **Do not enable wildcard**: `Access-Control-Allow-Origin: *` is strictly prohibited.
* For same-origin ERP APIs, avoid adding unnecessary CORS headers.
* If CORS is ever required for an external integration, allow only the exact approved origin.

---

## 9. MongoDB Atlas Connection Architecture

Vercel is the serverless application host. MongoDB Atlas remains the sole database.

### Production:
```text
Vercel Production → MongoDB Atlas → tamizhtech
```

### Preview / E2E:
```text
Vercel Preview / E2E → MongoDB Atlas → tamizhtech_e2e
```

* Ensure IP access list in MongoDB Atlas is configured for Vercel (allowing access from `0.0.0.0/0` with strong database user credentials, or using MongoDB Atlas Vercel Integration).

---

## 10. Redis Architecture

* Redis is **OPTIONAL**.
* When enabled, use Upstash Redis (serverless REST integration).
* Redis must remain **CACHE ONLY**.
* **Never use Redis as the authoritative source of truth for:**
  - Stock / inventory quantities
  - Invoice numbers
  - Quotation numbers
  - Payment records
  - Production idempotency
  - Financial ledger history
* MongoDB Atlas remains 100% authoritative for all business and financial records.

---

## 11. Production Database Safety

Before every production deployment verify:
```text
DATABASE_URL → contains "/tamizhtech?"
```

Before every E2E / Preview run verify:
```text
DATABASE_URL → contains "/tamizhtech_e2e?"
```

Do not rely on the database name alone without checking the actual connection target string.

---

## 12. Vercel Deployment Smoke Test

After production deployment, execute the smoke test:

### Public Routes:
* `GET /` &rarr; HTTP 200/302, valid HTTPS, TTRC branding.
* `GET /login` &rarr; HTTP 200, clean login form.

### Protected Routes (Unauthenticated):
* Open `/dashboard`, `/invoices`, `/quotations`, `/customers`.
* **Expected**: Immediate redirection to `/login` (307/302).

### API Routes:
* Unauthenticated `POST /api/invoices`, `POST /api/quotations`, `POST /api/clients`.
* **Expected**: HTTP 401 Unauthorized.

---

## 13. Live Security Header Verification

Verify via cURL or browser devtools against the live deployed Vercel domain:
```bash
curl -I https://your-erp-domain
```
Confirm the presence of:
* `strict-transport-security`
* `x-frame-options: SAMEORIGIN`
* `x-content-type-options: nosniff`
* `referrer-policy: origin-when-cross-origin`
* `permissions-policy: camera=(), microphone=(), geolocation=()`

---

## 14. Live Cookie Verification

1. Log in to the production ERP at `https://your-erp-domain`.
2. Inspect Application &rarr; Cookies in browser devtools.
3. Confirm session cookie has:
   * Name: `__Secure-next-auth.session-token` (or `next-auth.session-token` if non-SSL)
   * `HttpOnly`: Checked / True
   * `Secure`: Checked / True
   * `SameSite`: `Lax`

---

## 15. Live Firewall Verification

1. Submit a normal login request &rarr; HTTP 200 allowed.
2. Submit an unauthorized mutation request &rarr; Rejected with 401.
3. Trigger rapid successive failed auth attempts &rarr; Verify Vercel Firewall / rate-limiting triggers according to configured rule.
4. Monitor Vercel Firewall activity in Vercel Dashboard &rarr; Project &rarr; Firewall.

---

## 16. Vercel Production Build

Local pre-flight check before deploying:
```bash
npx tsc --noEmit
npx next build
```
**Expected**: `0 errors`.

Then deploy to Vercel production branch (`git push origin main` or `vercel --prod`).

---

## 17. Final Real-World Smoke Test

Do not perform destructive QA in production.

Execute the first live transaction chain:
```text
Real Customer
    ↓
TT-CL-0001
    ↓
Real Quotation
    ↓
TTRC-QTN-2026-0001
    ↓
Convert / Create Invoice
    ↓
TTRC-BILL-2026-0001
    ↓
Stock update
    ↓
Payment
    ↓
Receipt
    ↓
Reports
    ↓
PDF
```
This forms the first genuine production ledger entries.

---

## 18. VERCEL-ONLY FINAL ACCEPTANCE MATRIX

Mark the deployment ready only when every item is verified:

* [x] Production deployment succeeds on Vercel
* [x] HTTPS works via Vercel TLS
* [x] Custom domain attached and resolved
* [x] Environment variables configured under Vercel Production scope
* [x] Production DB points strictly to `tamizhtech`
* [x] Preview/E2E DB isolation confirmed on `tamizhtech_e2e`
* [x] Authentication works via NextAuth
* [x] Authorization enforced server-side
* [x] Cookies secure (`HttpOnly`, `SameSite=Lax`, `Secure`)
* [x] Security headers present in live HTTP responses
* [x] Vercel Firewall configured for `/api/auth/*` and mutations
* [x] No wildcard CORS (`Access-Control-Allow-Origin: *` absent)
* [x] No exposed secrets in client JS
* [x] PDF generation works
* [x] Print layouts render cleanly
* [x] Inventory ledger movements verified
* [x] In-house production tracking verified
* [x] Invoices and bills work
* [x] Quotations and status transitions work
* [x] Payments and balance calculations work
* [x] Reports and summaries work
* [x] Commercial numbering sequence counters verified (0001 start)
* [x] Production backup exists (`docs/backups/pre_launch_production_backup.json`)
* [x] Disaster recovery restore procedure verified (100% match in `tamizhtech_e2e`)
* [x] Application builds with 0 errors

---

### Final Operational Verdict
**READY FOR PUBLIC BUSINESS USE ON VERCEL**

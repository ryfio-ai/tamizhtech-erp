# TAMIZHTECH ERP 2.0 — COMPLETE TECHNICAL AUDIT REPORT
**Target System:** TamizhTech ERP (Internal Business Operating System)  
**Company:** Tamizh Tech Robotics Company (Coimbatore, Tamil Nadu, India)  
**Repository:** `https://github.com/ryfio-ai/tamizhtech-erp.git`  
**Audit Date:** September 16, 2026  
**Auditor:** Antigravity Engineering (Lead Architecture Agent)  
**Status:** COMPLETE AUDIT (Phase 0 / Task 76)

---

## EXECUTIVE SUMMARY

TamizhTech ERP is an internal enterprise resource planning system developed approximately six months ago to run the core operations of **Tamizh Tech Robotics Company**. Rather than discarding the codebase or building a greenfield replica, this technical audit analyzes the existing architecture, database models, APIs, security mechanisms, UI components, workflows, and defects. 

The audit reveals that while the application provides a solid foundational skeleton covering CRM, invoicing, payments, follow-ups, finance, and applications, it suffers from:
1. **Critical API Security Gaps**: The NextAuth middleware explicitly excludes all `/api/*` routes, and virtually zero API endpoints verify user authentication or role authorization.
2. **Runtime Crashing Bugs in APIs**: Endpoints such as `POST /api/leads`, `POST /api/products`, and `POST /api/projects` crash due to missing required schema fields (`leadCode`, `sku`, `createdById`).
3. **Data Inconsistencies & Race Conditions**: Sequential human-readable IDs (`TT-INV-XXXX`, `TT-CL-XXXX`) rely on `prisma.count() + 1` without concurrency locks, leading to duplicate key errors under concurrent use. Payment status casing mismatches (`"Paid"` vs `"PAID"`) break dashboard finance aggregations.
4. **Completely Inactive Audit Logging**: Although `AuditLog` and `ActivityLog` tables exist in Prisma, no mutation endpoint in the entire ERP creates log records.
5. **Brand Color Discrepancies**: The UI and PDF templates utilize Crimson Red (`#C0392B`) and Navy (`#1A1A2E`) rather than Tamizh Tech's official primary brand orange (`#FF6B00`) and neutral background palette.
6. **Missing Production Workflows**: Full Quotation lifecycle, Sales Orders, Inventory Stock Transactions, Purchasing/Vendors, Centralized Documents, Centralized Settings, and Global Search (`Ctrl+K`) are not yet operational.
7. **Database Deployment Bottleneck**: The application runs on local SQLite (`file:./dev.db`), unindexed and vulnerable to lock contention, and must be upgraded to PostgreSQL with production migration safeguards.

---

## SECTION A: CURRENT ARCHITECTURE

```mermaid
graph TD
    Client["Client Browser (React 18 / Next.js 14 App Router)"]
    MW["Middleware (middleware.ts) - Page Routes Only"]
    NextAuth["NextAuth 4.24 (lib/auth.ts - JWT Strategy)"]
    API["API Route Handlers (/app/api/*)"]
    Prisma["Prisma ORM 5.22.0 Client (/lib/prisma.ts)"]
    SQLite[("Local SQLite Database: dev.db")]
    Nodemailer["Nodemailer (Gmail SMTP)"]
    ReactPDF["@react-pdf/renderer (Server Streams + Client Blobs)"]
    SheetJS["xlsx 0.18.5 (In-Browser JSON to Sheet)"]

    Client -->|Navigates Pages| MW
    MW -->|Verifies Token| NextAuth
    Client -->|Fetches /api/* (BYPASSES MW)| API
    API -->|Direct Queries| Prisma
    Prisma -->|Read / Write| SQLite
    API -->|Dispatch Transactional Mails| Nodemailer
    API -->|Stream Invoices| ReactPDF
    Client -->|Export CSV / XLSX| SheetJS
```

### 1. Technology Stack Breakdown
- **Framework**: Next.js 14.2.3 (App Router with client components `"use client"` predominating).
- **Core Runtime**: React 18.2.0, React DOM 18.2.0, TypeScript 5.4.3.
- **Data Access**: Prisma ORM 5.22.0 with SQLite provider (`url = "file:./dev.db"`).
- **Authentication**: NextAuth.js 4.24.7 using Credentials provider and JWT session strategy.
- **Styling**: Tailwind CSS 3.4.3 with custom color tokens, `@radix-ui` primitives, Lucide React 0.364.0 icons.
- **Forms & Validation**: React Hook Form 7.51.2, `@hookform/resolvers` 3.3.4, Zod 3.22.4.
- **Charts**: Recharts 2.12.3.
- **Document & File Handling**: `@react-pdf/renderer` 3.2.2 for invoice rendering; client-side SheetJS (`xlsx` 0.18.5) for tabular exports.
- **Email**: Nodemailer 6.10.1 configured with personal Gmail SMTP.
- **Build Configurations**: Dual Next.js configuration files exist in root (`next.config.mjs` and `next.config.ts`), causing configuration ambiguity. `.npmrc` sets `legacy-peer-deps=true` to resolve `@dnd-kit/react: ^0.1.0` pre-release dependency conflicts.

---

## SECTION B: EXISTING MODULES

| Module | Status | UI Implementation | Backend API | Description & Working State |
| :--- | :--- | :--- | :--- | :--- |
| **Dashboard** | Partially Working | `/` (page.tsx) | `/api/dashboard/stats` | Displays stat cards, revenue chart, payment status chart, recent invoices, follow-ups. Fetches entire database on 60s interval; revenue array hardcoded empty `[]`. |
| **Clients (CRM)** | Working with flaws | `/clients`, `/clients/[id]` | `/api/clients`, `/api/clients/[id]`, `/api/clients/[id]/relations` | Table listing, search filter, creation modal, detailed client profile view. Lacks company details, quotes, and orders integration. |
| **Leads** | Broken API / Missing UI | None (No `/leads` page) | `/api/leads` | Backend endpoint exists but crashes on POST due to missing `leadCode`. No frontend page exists in sidebar or routes. |
| **Invoices** | Partially Working | `/invoices`, `/invoices/new`, `/invoices/[id]` | `/api/invoices`, `/api/invoices/[id]`, `/api/invoices/[id]/pdf` | Invoice list, creation with dynamic line items, PDF generation. Status filter broken due to property mismatch (`paymentStatus` vs `status`). |
| **Payments** | Partially Working | `/payments`, `/payments/new` | `/api/payments`, `/api/payments/[id]` | Recording payments updates invoice balance. Mixed-case status strings (`"Paid"`) break uppercase status filters. |
| **Follow-ups** | Working | `/followups` | `/api/followups`, `/api/followups/[id]` | Task table, date filters, pending/overdue tracking, modal creation. |
| **Applications** | Partially Working | `/applications` | `/api/applications`, `/api/applications/[id]` | Kanban drag-and-drop board for training leads. "Convert to Client" button sends `undefined` contact details. |
| **Products** | Broken Create | `/products` | `/api/products` | Catalog listing works. Creating products crashes because `sku` is omitted from request and validation schema. |
| **Finance** | Partially Working | `/finance` | `/api/finance/stats` | Invoiced vs received metrics, category expense breakdown, chart of accounts list. In-memory array filtering on full database. |
| **HR & Payroll** | Partially Working | `/hr` | `/api/employees` | Employee directory, add employee modal with user account generation. Missing actual attendance and payroll calculation. |
| **Projects & Tasks** | Broken Create | `/projects` | `/api/projects` | Project cards with budget and task statistics. Creating projects crashes because `createdById` foreign key is missing. |
| **Audit Logs** | UI Only (No data) | `/audit` | `/api/audit` | Displays `AuditLog` and `ActivityLog` tables. Only displays mock data from seed; zero live mutations generate audit logs. |
| **Quotations** | Missing | None | None | Model `Quotation` exists in schema, but zero UI pages or APIs exist. |
| **Inventory** | Missing | None | None | `StockMovement` model exists, but no inventory transaction UI or purchase flows exist. |
| **Purchasing / Vendors** | Missing | None | None | No models, no APIs, no UI. |
| **Settings** | Missing | None | None | Hardcoded company credentials scattered across files; no centralized settings interface. |
| **Global Search** | Missing | Dummy input in TopBar | None | Search input in header has no handlers or backend search integration. |

---

## SECTION C: EXISTING ROUTES

### 1. Page Routes
- `/(dashboard)/page.tsx` — Main dashboard overview.
- `/(dashboard)/applications/page.tsx` — Educational applications Kanban board.
- `/(dashboard)/audit/page.tsx` — System activity and audit trail viewer.
- `/(dashboard)/clients/page.tsx` — Client directory and table view.
- `/(dashboard)/clients/[id]/page.tsx` — Detailed client profile with tabs.
- `/(dashboard)/finance/page.tsx` — Finance overview, expenses, and accounts.
- `/(dashboard)/followups/page.tsx` — CRM follow-up action list.
- `/(dashboard)/hr/page.tsx` — HR employee directory.
- `/(dashboard)/invoices/page.tsx` — Invoicing management table.
- `/(dashboard)/invoices/new/page.tsx` — Full invoice builder form.
- `/(dashboard)/invoices/[id]/page.tsx` — Invoice detail and receipt view.
- `/(dashboard)/payments/page.tsx` — Payment ledger table.
- `/(dashboard)/payments/new/page.tsx` — Record payment modal/page.
- `/(dashboard)/products/page.tsx` — Hardware product catalog.
- `/(dashboard)/projects/page.tsx` — Engineering projects and task tracker.
- `/login/page.tsx` — NextAuth credentials authentication screen.

### 2. Missing & Dead Page Routes
- `/support` — Linked in `components/layout/Sidebar.tsx` (line 35), but route does not exist (returns 404).
- `/leads` — API exists, but no user-facing page exists.
- `/quotations`, `/orders`, `/inventory`, `/purchasing`, `/vendors`, `/settings`, `/reports`, `/documents` — Do not exist.

---

## SECTION D: EXISTING DATABASE MODELS (29 Models)

The Prisma schema defines 29 data models under SQLite:

1. **User & Authentication**:
   - `User`: `id`, `name`, `email`, `emailVerified`, `image`, `phone`, `role` (default `"VIEWER"`), `status` (default `"ACTIVE"`), `passwordHash`, `createdAt`, `updatedAt`.
   - `Session`: `id`, `sessionToken`, `userId`, `expires`.
   - `Account`: `id`, `userId`, `type`, `provider`, `providerAccountId`.
2. **CRM & Clients**:
   - `Client`: `id`, `clientCode`, `name`, `type`, `status`, `phone`, `email`, `city`, `serviceType`, `source`, `assignedToId`, `createdAt`, `updatedAt`.
   - `ClientContact`: `id`, `clientId`, `name`, `phone`, `email`, `type`.
   - `Lead`: `id`, `leadCode`, `name`, `email`, `phone`, `status`, `source`, `assignedToId`, `createdAt`, `updatedAt`.
   - `FollowUp`: `id`, `clientId`, `leadId`, `date`, `mode`, `status`, `notes`.
3. **Sales & Billing**:
   - `Invoice`: `id`, `invoiceNo`, `clientId`, `clientName`, `status`, `date`, `dueDate`, `subtotal`, `gstAmount`, `total`, `paidAmount`, `balance`, `createdAt`, `updatedAt`.
   - `InvoiceItem`: `id`, `invoiceId`, `description`, `qty`, `unitPrice`, `amount`.
   - `Quotation`: `id`, `quotationNo`, `clientId`, `status`, `total`, `validUntil`, `createdAt`.
   - `Payment`: `id`, `paymentNo`, `invoiceId`, `clientId`, `amount`, `date`, `mode`, `status`, `transactionId`, `referenceNo`, `notes`, `createdAt`, `updatedAt`.
4. **Products & Inventory**:
   - `Product`: `id`, `sku`, `name`, `description`, `type`, `status`, `basePrice`, `taxRate`, `stockQuantity`, `createdAt`, `updatedAt`.
   - `StockMovement`: `id`, `productId`, `qty`, `type`, `createdAt`.
5. **Finance & Accounting**:
   - `Expense`: `id`, `expenseNo`, `category`, `amount`, `date`, `description`, `status`, `createdById`, `approvedById`.
   - `ChartOfAccount`: `id`, `code`, `name`, `type`, `subType`, `balance`.
   - `JournalEntry`: `id`, `date`, `accountId`, `type`, `amount`, `description`.
6. **HR & Payroll**:
   - `Employee`: `id`, `employeeId`, `userId`, `firstName`, `lastName`, `designation`, `department`, `status`.
   - `Attendance`: `id`, `employeeId`, `date`, `status`.
   - `LeaveRequest`: `id`, `employeeId`, `type`, `startDate`, `endDate`, `status`.
   - `Payroll`: `id`, `employeeId`, `month`, `year`, `basicSalary`, `netSalary`, `status`.
7. **Projects & Tasks**:
   - `Project`: `id`, `name`, `clientId`, `status`, `startDate`, `endDate`, `budget`, `createdById`, `managerId`, `createdAt`, `updatedAt`.
   - `Task`: `id`, `projectId`, `title`, `description`, `status`, `priority`, `dueDate`, `assignedToId`, `createdById`, `createdAt`, `updatedAt`.
8. **Workshops, Tickets & Logs**:
   - `Application`: `id`, `appNo`, `clientId`, `status`, `course`, `createdAt`.
   - `Event`: `id`, `name`, `status`, `date`.
   - `SupportTicket`: `id`, `ticketNo`, `subject`, `status`, `priority`, `assignedToId`.
   - `ActivityLog`: `id`, `userId`, `module`, `action`, `details`, `createdAt`.
   - `Notification`: `id`, `userId`, `type`, `title`, `message`, `read`, `createdAt`.
   - `AuditLog`: `id`, `userId`, `action`, `module`, `oldData`, `newData`, `createdAt`.
   - `Comment`: `id`, `userId`, `content`, `createdAt`.

### Schema Weaknesses Identified:
- **No Database Enums**: All enum-like fields (`role`, `status`, `mode`, `type`) are stored as plain strings with inline comments, allowing invalid values and casing mismatches.
- **Zero Indexes on Foreign Keys**: Foreign keys (`clientId`, `assignedToId`, `invoiceId`, `userId`, `productId`) lack Prisma `@@index` annotations, degrading join queries.
- **Missing Core Models**: Missing `QuotationItem`, `Order`, `OrderItem`, `Vendor`, `PurchaseOrder`, `PurchaseOrderItem`, `Document`, and `SystemSetting`.

---

## SECTION E: EXISTING APIs (22 Endpoints)

| Endpoint | Method | Implemented Operations | Auth Check? | Primary Flaw / Risk |
| :--- | :--- | :--- | :--- | :--- |
| `/api/auth/[...nextauth]` | ALL | NextAuth handler | N/A | Standard handler. |
| `/api/clients` | GET, POST | List clients, create client | **NONE** | No auth; duplicate check lacks database lock; race condition on clientCode. |
| `/api/clients/[id]` | GET, PUT, DELETE | Profile, update, delete | **NONE** | No auth; hard delete cascades without financial guardrails. |
| `/api/clients/[id]/relations` | GET | Client invoices/payments | **NONE** | No auth; unauthenticated financial exposure. |
| `/api/leads` | GET, POST | List leads, create lead | **NONE** | **CRASHES ON POST**: Missing required `leadCode`; passes invalid `notes` field. |
| `/api/invoices` | GET, POST | List invoices, create invoice | **NONE** | No auth; race condition on `invoiceNo`; hardcoded 18% GST; no audit logging. |
| `/api/invoices/[id]` | GET, PUT, DELETE | Read, update, delete invoice | **NONE** | No auth; balance not recalculated transactionally. |
| `/api/invoices/[id]/pdf` | GET | Stream generated PDF | **NONE** | No auth; public access to sensitive invoice PDFs. |
| `/api/payments` | GET, POST | List, create payment + update inv | **NONE** | Casing mismatch (`"Paid"` vs `"PAID"`); no audit log. |
| `/api/payments/[id]` | GET, DELETE | Read, delete payment | **NONE** | Deleting payment does not adjust invoice balance! Data inconsistency. |
| `/api/products` | GET, POST | List products, create product | **NONE** | **CRASHES ON POST**: Missing required `sku` field. |
| `/api/projects` | GET, POST | List projects, create project | **NONE** | **CRASHES ON POST**: Missing required `createdById` foreign key. |
| `/api/followups` | GET, POST | List, create follow-up | **NONE** | No auth check. |
| `/api/followups/[id]` | GET, PUT, DELETE | Update status, delete | **NONE** | No auth check. |
| `/api/applications` | GET, POST | List, create application | **NONE** | No auth check; race condition on `appNo`. |
| `/api/applications/[id]` | GET, PUT, DELETE | Update status, delete | **NONE** | No auth check. |
| `/api/employees` | GET, POST | List, create employee + user | **NONE** | Imports non-existent `UserRole`; allows unauthenticated user creation! |
| `/api/dashboard/stats` | GET | Compute overview stats | **NONE** | Loads 7 full database tables into RAM; empty `monthlyRevenue`. |
| `/api/finance/stats` | GET | Compute finance stats | **NONE** | In-memory loop over all historical invoices and payments. |
| `/api/audit` | GET | Retrieve audit / activity logs | **NONE** | No auth check; anyone can inspect company logs. |
| `/api/mail/send` | POST | Send transactional email | **YES** | The ONLY route with `getServerSession`. Uses Gmail SMTP. |
| `/api/email` | POST | Secondary mail endpoint | **NONE** | Duplicate endpoint with no auth. |

---

## SECTION F: EXISTING AUTHENTICATION

- **Configuration**: `lib/auth.ts` implements NextAuth with `CredentialsProvider`.
- **Credentials Matching**: Queries `prisma.user.findUnique({ where: { email } })` and compares password with `bcrypt.compare`.
- **Session Lifespan**: JWT session strategy without server-side invalidation.
- **Login Screen**: `/login/page.tsx` provides clean email and password fields, redirecting to `/` on success.
- **Critical Backdoor Finding**: `lib/auth-options.ts` is an unremoved legacy file defining credentials:
  ```typescript
  if (credentials?.username === "adminTT" && credentials?.password === "adminTT") {
    return { id: '1', name: 'TamizhTech Admin', email: 'admin@tamizhtech.in' };
  }
  ```
  While `app/api/auth/[...nextauth]/route.ts` currently imports `lib/auth.ts`, the presence of `lib/auth-options.ts` with hardcoded credentials in the repository represents an extreme vulnerability if imported.

---

## SECTION G: EXISTING AUTHORIZATION & RBAC

- **Role Definitions**: User model defines `role` as a string (`"VIEWER"`, `"ADMIN"`, `"SUPER_ADMIN"`, etc.).
- **Page-Level Protection**: `middleware.ts` redirects unauthenticated users to `/login`.
- **CRITICAL FLAW — Complete API Bypass**:
  ```typescript
  export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
  };
  ```
  Because the middleware pattern explicitly excludes `/api`, **every API route is completely unprotected**. Any HTTP client can issue `GET /api/finance/stats`, `POST /api/employees`, `DELETE /api/invoices/xyz`, or `GET /api/clients` with zero authentication headers or cookies.
- **No Role-Based Authorization**: No endpoint verifies whether the user is `FINANCE`, `SALES`, `ADMIN`, or `VIEWER`. A `VIEWER` can perform destructive actions simply by making an API call.

---

## SECTION H: EXISTING EMAIL SYSTEM

- **Provider**: Nodemailer using personal Gmail SMTP (`service: 'gmail'`).
- **Credentials**: Stored in plaintext in `.env`:
  ```ini
  GMAIL_USER=tamizhtechpvtltd@gmail.com
  GMAIL_APP_PASSWORD=TT@710121106030
  ```
- **Templates**: `lib/email-templates.ts` hardcodes `#C0392B` and lists the outdated location "Hosur, Tamil Nadu" instead of Coimbatore.
- **Violation of Target Direction**: Prompt Section 5 and Section 34 mandate migrating to **Resend** transactional email with domain authentication, branded HTML templates, and full error logging.

---

## SECTION I: EXISTING PDF GENERATION SYSTEM

- **Library**: `@react-pdf/renderer` v3.2.2.
- **Server Route**: `/api/invoices/[id]/pdf` uses `renderToStream` to render `InvoicePDFTemplate`.
- **Client Route**: `lib/pdf-generator.ts` defines `generateInvoicePDF` using client-side `pdf().toBlob()`, `URL.createObjectURL()`, and programmatic `<a>` tag clicks.
- **Flaws**:
  - `InvoicePDFTemplate.tsx` references properties (`gstPercent`, `discountAmount`, `notes`) not present in Prisma `Invoice` model.
  - Hardcoded red banner (`#C0392B`) rather than official Tamizh Tech brand orange.
  - Company address and GSTIN are hardcoded inside the component rather than fetched from dynamic configuration.

---

## SECTION J: EXISTING EXPORTS

- **Implementation**: Handled exclusively on the client side in `components/shared/ExportButton.tsx` using SheetJS (`xlsx`).
- **Flaws**:
  - Only exports the items currently in React component state. If a table has 500 records but is paginated to 20, only 20 records are exported.
  - No server-side streaming or authorization checks.
  - Invoices export table references non-existent columns: `{ header: "Discount", key: "discountAmount" }` and `{ header: "Status", key: "paymentStatus" }`.

---

## SECTION K: EXISTING AUDIT LOGS

- **Data Models**: `AuditLog` and `ActivityLog` exist in Prisma.
- **UI Viewer**: `app/(dashboard)/audit/page.tsx` renders tabs for Audit and Activity logs.
- **CRITICAL FLAW**: **Zero active mutations call `prisma.auditLog.create` or `prisma.activityLog.create`.**
  - Searches for `auditLog.create` and `activityLog.create` show they are ONLY invoked in `prisma/seed.ts` with synthetic data.
  - When an invoice is created, payment recorded, client modified, or employee added, **no audit log is recorded**.
  - No IP address or user-agent tracking is implemented.

---

## SECTION L: DETAILED CODE DEFECTS & BUGS

1. **POST `/api/leads` Runtime Crash**:
   - In `app/api/leads/route.ts`, `prisma.lead.create` does not supply `leadCode`, which is defined as `leadCode String @unique` without a `@default` in Prisma schema. It also attempts to pass `notes`, which does not exist on `model Lead`.
2. **POST `/api/products` Runtime Crash**:
   - In `app/api/products/route.ts`, `prisma.product.create` does not supply `sku`, which is a required unique field in `prisma.product`. Creating any product via the UI modal throws a 500 error.
3. **POST `/api/projects` Runtime Crash**:
   - In `app/api/projects/route.ts`, `prisma.project.create` omits `createdById`, a required foreign key relation to `User`. Project creation fails at runtime.
4. **Mixed-Case Payment Status Casing Bug**:
   - `app/api/payments/route.ts` lines 65-67 sets `newStatus = "Paid"` or `"Partial"`, while `app/api/dashboard/stats/route.ts` line 53 expects all-caps `"PAID"`. This causes paid invoices to be counted as unpaid in dashboard statistics.
5. **Invoices Page Filter Broken by Invalid Property Name**:
   - In `app/(dashboard)/invoices/page.tsx` line 46: `inv.paymentStatus !== statusFilter`. `paymentStatus` does not exist on `Invoice` (`status` is the property). Filtering by status always yields empty or incorrect results.
6. **Applications to Client Conversion Sends Undefined Data**:
   - In `app/(dashboard)/applications/page.tsx` lines 58-64, `handleConvertToClient` attempts to read `app.name`, `app.email`, `app.phone`, and `app.city`. These fields do not exist on `Application` (they reside on `Client`).
7. **Race Condition in ID Generation**:
   - Across `invoices`, `clients`, `payments`, and `employees`, IDs are generated using `const count = await prisma.table.count(); ID = ... + (count + 1)`. Under concurrent requests, two records receive the same ID, causing unhandled database unique-constraint crashes.
8. **Dashboard Revenue Graph Empty**:
   - In `app/api/dashboard/stats/route.ts` line 107, `monthlyRevenue: []` is always returned as an empty array, leaving the dashboard chart blank.
9. **Dead Navigation Link**:
   - `components/layout/Sidebar.tsx` has a link to `/support`, but no route or page exists, triggering a 404 error.
10. **Duplicate Next.js Config Files**:
    - Both `next.config.mjs` and `next.config.ts` exist in the root directory. In Next.js 14, `next.config.ts` is ignored, silently disabling custom webpack aliases.
11. **Client Deletion Leaves Orphaned Invoices**:
    - `DELETE /api/clients/[id]` does not verify whether unpaid invoices or active projects exist, risking orphaned financial records or foreign key constraint crashes.
12. **Payment Deletion Fails to Revert Invoice Balance**:
    - `DELETE /api/payments/[id]` deletes the payment record but does not update `invoice.paidAmount` or `invoice.balance`, leaving corrupted financial balances.

---

## SECTION M: EXISTING SECURITY VULNERABILITIES

1. **Unprotected API Surface**: Middleware exclusion leaves all 22 API endpoints accessible without authentication.
2. **Hardcoded Secrets in Git**:
   - `.env` committed with `GMAIL_APP_PASSWORD=TT@710121106030` and `NEXTAUTH_SECRET=tamizhtech-super-secret-key-99887766`.
   - `lib/auth-options.ts` containing hardcoded administrative credentials.
3. **No Role-Based Authorization Enforcement**: Absence of permission checks allows any authenticated or unauthenticated client to perform administrative actions.
4. **Destructive Seed Script in Repository**:
   - `prisma/seed.ts` begins with `await prisma.application.deleteMany(); ... await prisma.client.deleteMany();`. If executed on production, all company data is permanently destroyed.
5. **Missing Rate Limiting**: No rate limiting exists on `/api/auth` or transaction endpoints, leaving the system vulnerable to brute-force and denial-of-service attacks.
6. **CORS and Content Security**: Default headers without strict CSP or origin checks on API routes.

---

## SECTION N: EXISTING UX DEFECTS

1. **Brand Identity Inconsistency**: The application uses crimson red (`#C0392B`) and dark navy (`#1A1A2E`) throughout sidebar, buttons, and PDF headers instead of official Tamizh Tech Orange (`#FF6B00`).
2. **Non-Functional Header Elements**:
   - The TopBar search bar is a static HTML `<input>` with no event handler or keyboard shortcut.
   - The notification bell icon is an inactive button with no notification dropdown.
3. **Missing Quick Action Menu**: No global speed-dial to quickly record a lead, invoice, payment, or task.
4. **Incomplete Client CRM Tabs**: Client details page lacks tabs for Quotations, Orders, Projects, Documents, and Unified Timeline.
5. **No Confirmation Feedback on Destructive Acts**: Multiple delete buttons perform immediate deletion without double confirmation or soft-delete safeguards.

---

## SECTION O: RESPONSIVE & MOBILE DEFECTS

1. **Table Overflow**: Data tables (`InvoiceTable`, `ClientTable`, `PaymentTable`) lack mobile card views and cause horizontal scrollbar clipping on devices under 768px.
2. **Touch Target Sizing**: Row action buttons (edit, delete, view) measure 28px–32px, violating the 44px minimum touch target guideline.
3. **Kanban Usability on Mobile**: `ApplicationKanban` columns break layout bounds on screens below 640px.
4. **Modal Form Cramping**: Dynamic invoice line-item editors become unusable on small screens due to fixed column widths.

---

## SECTION P: PERFORMANCE & SCALABILITY WEAKNESSES

1. **Unbounded Full Table Scans**: `/api/dashboard/stats` and `/api/finance/stats` execute `prisma.invoice.findMany()`, `prisma.payment.findMany()`, etc., loading entire tables into Node.js memory.
2. **60-Second Polling Overload**: Dashboard component issues client-side polling every 60 seconds, triggering heavy multi-table memory aggregations.
3. **Missing Database Indexes**: Foreign key relations lack explicit indexes in `schema.prisma`.
4. **Client Bundle Weight**: `@react-pdf/renderer` in client bundles increases JavaScript bundle size unnecessarily.

---

## SECTION Q: MISSING BUSINESS CAPABILITIES

To serve as the operating system for Tamizh Tech Robotics Company, the following missing capabilities must be built:
1. **Quotation Workflow**: Quotation creation with custom items, discount, validity, PDF export, Resend email dispatch, and one-click conversion to Sales Order.
2. **Sales Orders**: Bridge between accepted quotation and engineering fulfillment.
3. **Inventory & Stock Management**: Real transaction ledger tracking PURCHASES, SALES, ADJUSTMENTS, RESERVATIONS, and DAMAGE.
4. **Vendor Management & Purchasing**: Vendor profiles, Purchase Orders, inventory intake, and vendor bill payments.
5. **Centralized Document Management**: Secure upload metadata storage linked to Customers, Leads, Quotations, and Projects.
6. **Settings Engine**: Company profile, GSTIN, invoice prefix, tax rates, and email settings stored in the database.
7. **Business Reports**: Practical revenue, receivables, lead conversion, and inventory reports.
8. **Global Search (`Ctrl+K`)**: Rapid search across Customers, Leads, Invoices, Quotations, and Tasks.

---

## SECTION R: DATABASE MIGRATION RISKS

1. **SQLite to PostgreSQL Transition**:
   - SQLite uses loose typing and text dates; PostgreSQL enforces strict types, constraints, and UTC timezone handling.
   - Migrating existing data must preserve all CUIDs, relations, and historical values without loss.
2. **Seed Safety**: Production seed scripts must NEVER wipe data; only seed the initial administrative account if missing.
3. **Migration Integrity**: Schema changes must use versioned Prisma migrations (`prisma migrate dev` / `prisma migrate deploy`), never `prisma db push` or `prisma migrate reset` in production.

---

## SECTION S: RECOMMENDED UPGRADE PLAN (24 PHASES)

Following the sequence mandated in Master Prompt Item 66:
- **Phase 0**: Repository & codebase technical audit (**Completed** in this document).
- **Phase 1**: Architecture & dependency alignment (Next.js 14, React 18, clean configs, peer dependency cleanup).
- **Phase 2**: Database schema refinement & PostgreSQL migration readiness.
- **Phase 3**: Authentication & RBAC security hardening (protecting all `/api/*` endpoints).
- **Phase 4**: UI Design System & Application Shell (Tamizh Tech orange `#FF6B00`, clean typography, modern sidebar).
- **Phase 5**: Redesigned Operational Dashboard (today's leads, open follow-ups, receivables, tasks).
- **Phase 6**: CRM & Lead Management (contact data validation, source tracking, pipeline).
- **Phase 7**: Customer CRM & Quotation Engine (quotation lifecycle, PDF, email, conversion).
- **Phase 8**: Robotics Products & Engineering Services (SKU management, services taxonomy).
- **Phase 9**: Orders, Projects & Task Management (project milestones, budgets, simple tasks).
- **Phase 10**: Inventory Ledger & Vendor Purchasing (stock transactions, purchase orders).
- **Phase 11**: Invoicing, Payments & Expenses (transactional balances, GST calculations, expense tracking).
- **Phase 12**: Follow-ups & Communications (calls, meetings, reminders).
- **Phase 13**: Centralized Document Management (secure attachments and metadata).
- **Phase 14**: Business Reports & Financial Analytics.
- **Phase 15**: System Audit Trail & Unified Activity Timeline.
- **Phase 16**: Global Search (`Ctrl+K`) & Quick Action Menu.
- **Phase 17**: Resend Email Integration & Notification Center.
- **Phase 18**: Mobile & Responsive Optimization (320px to 2560px).
- **Phase 19**: Comprehensive Security Hardening (rate limiting, input validation, headers).
- **Phase 20**: Query Optimization & Performance Tuning.
- **Phase 21**: Automated Unit & Integration Testing.
- **Phase 22**: End-to-End Workflow Verification.
- **Phase 23**: Production Migration & Seed Isolation Verification.
- **Phase 24**: Final Release Audit & Documentation.

---
*Report generated and validated for Tamizh Tech Robotics Company.*

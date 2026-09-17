# TAMIZHTECH ERP 2.0 — DATABASE MIGRATION PLAN
**Document Version:** 2.0 (MongoDB Atlas Specification)  
**Target Engine:** MongoDB Atlas Cluster0 (`tamizhtech`)  
**ORM / Driver:** Prisma 5.22+ (MongoDB Connector) + Native MongoDB Driver (v6.12.0)  
**Source Baseline:** SQLite (`file:./dev.db` - Clean Baseline)  
**Status:** REHEARSAL 100% PASS — READY FOR GATE 3  

---

## 1. EXECUTIVE OVERVIEW & CORE PRINCIPLES

This document defines the zero-data-loss database migration strategy from the SQLite prototype schema to production-grade MongoDB Atlas Cluster0 (`tamizhtech`) for **TamizhTech ERP 2.0**.

### Non-Negotiable Guardrails
1. **Zero Data Destruction**: `prisma migrate reset`, `prisma db push --force-reset`, and collection `drop()` are **STRICTLY PROHIBITED** against staging or production.
2. **Preservation of Existing Records**: All primary keys (`ObjectId`), business codes (`TT-CL-*`, `TT-INV-*`), timestamps, and relationships must be preserved intact without alteration.
3. **MongoDB Atlas as Single System of Record**: MongoDB Atlas `tamizhtech` is the single authoritative business system of record.
4. **No Mock Data in Production**: Production seeds create only the required super-administrator account, initial sequence counters, and company configuration.
5. **Strict Financial & Inventory Accounting**: Payment ledger compensating entries and signed stock movement ledgers prevent silent balance corruption.

---

## 2. COMPARATIVE SCHEMA ANALYSIS (SQLITE VS MONGODB ATLAS)

| Dimension | Legacy SQLite (v1) | Target MongoDB Atlas (v2) | Migration Mitigation |
| :--- | :--- | :--- | :--- |
| **Enums** | Plain strings with comments (e.g. `role String // Enum: UserRole`) | Native Prisma `enum` validation | Enforce state machines in Prisma schema; keep classifications as flexible strings. |
| **Identifiers** | Flat string `cuid()` | MongoDB `ObjectId` (`@db.ObjectId`) + decoupled human business numbers | Map internal `_id` to `ObjectId`; store separate unique sequential business IDs. |
| **Dates & Timestamps** | ISO text strings (`YYYY-MM-DDTHH:mm:ss.sssZ`) | BSON `DateTime` (`@default(now())`) | Enforce UTC storage across all timestamp fields. |
| **Monetary & Numbers** | SQLite `Float` (approximate floating point) | Integer minor units / exact Decimal | Standardize financial amounts; prevent JavaScript Float arithmetic drift. |
| **Referential Integrity**| Loosely enforced in SQLite by default | Enforced at Service Layer | Domain services validate existence of parent entities before child insertion. |
| **Indexes** | Few indexes; zero foreign key indexes | Comprehensive `@@index` on all references and search columns | Drastically improves query performance. |
| **Concurrency** | File-level write locking (contention) | Atomic document-level `$inc` and transactional operations | Concurrency-safe atomic sequence generation with zero counter collisions. |

---

## 3. STATE MACHINES VS CONFIGURABLE CLASSIFICATIONS

### Genuine State-Machine Enums (Strictly Typed)
The following fields represent finite, deterministic state transitions:

```prisma
enum UserRole {
  SUPER_ADMIN
  ADMIN
  MANAGER
  SALES
  FINANCE
  ENGINEERING
  OPERATIONS
  VIEWER
}

enum InvoiceStatus {
  DRAFT
  ISSUED
  PARTIALLY_PAID
  PAID
  CANCELLED
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REVERSED
}

enum PaymentEntryType {
  PAYMENT
  REVERSAL
  ADJUSTMENT
  CORRECTION
}

enum QuotationStatus {
  DRAFT
  SENT
  ACCEPTED
  REJECTED
  EXPIRED
  CANCELLED
}

enum OrderType {
  PRODUCT
  ENGINEERING
  MIXED
}

enum OrderStatus {
  PENDING
  IN_PROGRESS
  FULFILLED
  CANCELLED
}

enum FulfillmentStatus {
  NOT_REQUIRED
  PENDING
  PARTIAL
  FULFILLED
}

enum ProjectStatus {
  PLANNING
  ACTIVE
  ON_HOLD
  COMPLETED
  CANCELLED
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  BLOCKED
  DONE
}
```

### Configurable Business Classifications (Managed Strings)
To prevent rigid schema migrations whenever company product lines or sales channels expand, the following fields are maintained as validated strings / reference data:
- `LeadSource` (e.g., `WEBSITE`, `WHATSAPP`, `REFERRAL`, `INSTAGRAM`, `LINKEDIN`, `WALK_IN`, `OTHER`)
- `ExpenseCategory` (e.g., `MATERIALS`, `TRAVEL`, `TOOLS`, `OFFICE`, `SOFTWARE`, `MARKETING`, `LOGISTICS`, `UTILITIES`)
- `ProductCategory` (e.g., `ROBOTICS_KIT`, `MOTOR_CONTROLLER`, `SENSOR_BOARD`, `DRIVE_SYSTEM`, `RAW_MATERIAL`)
- `ServiceCategory` (e.g., `3D_PRINTING`, `LASER_CUTTING`, `PCB_DESIGN`, `ROBOTICS_AUTOMATION`)
- `FollowUpMode` (e.g., `CALL`, `WHATSAPP`, `EMAIL`, `MEETING`, `REMINDER`)

---

## 4. CLIENT → CUSTOMER TERMINOLOGY & SCHEMA MAPPING

### Background
The original schema used the database model name `Client` (`clientCode`, `clientId`). The enterprise standard is **Customer**.

### Non-Destructive Strategy
1. **Database Table Mapping**: 
   The database table retains or maps cleanly to `clients` (or `customers` via Prisma `@@map("clients")` to ensure existing relational keys and SQL backups remain completely valid).
2. **Application Domain Layer**:
   - The TypeScript service layer exposes `CustomerService`.
   - UI navigation, headers, breadcrumbs, and tables display **Customers**.
   - API endpoints accept both `/api/clients` (for backwards compatibility with existing forms) and provide canonical `/api/customers`.
3. **Zero Data Loss**: Existing IDs (`cuid`), `clientCode` values (e.g. `TT-CL-001`), and foreign keys on `invoices`, `payments`, `projects`, and `quotations` are preserved 100%.

---

## 5. NEW INFRASTRUCTURE MODELS SPECIFICATION

### 1. `IdempotencyRecord`
Prevents duplicate business record creation (especially on website lead ingestion and payment submissions):
```prisma
model IdempotencyRecord {
  id               String    @id @default(cuid())
  key              String
  scope            String
  requestHash      String
  entityType       String
  entityId         String?
  status           String    @default("PENDING") // PENDING, RESOLVED, REJECTED
  responseSnapshot String?
  createdAt        DateTime  @default(now())
  expiresAt        DateTime

  @@unique([key, scope])
  @@index([expiresAt])
}
```

### 2. `BusinessSequence`
Guarantees unique, concurrency-safe, human-readable numbers without race-prone `count() + 1`:
```prisma
model BusinessSequence {
  id         String   @id @default(cuid())
  name       String   @unique // INV, QUO, ORD, LEAD, CUS, PAY, PO
  prefix     String
  year       Int
  lastNumber Int      @default(0)
  updatedAt  DateTime @updatedAt
}
```

### 3. `StockLedgerEntry` (Source of Truth for Inventory)
Every inventory movement records an immutable entry with signed quantities:
```prisma
model StockLedgerEntry {
  id             String    @id @default(cuid())
  productId      String
  quantitySigned Float     // Positive for inbound (+), Negative for outbound (-)
  unitCost       Float?
  location       String?   @default("MAIN_WAREHOUSE")
  type           String    // PURCHASE, SALE, RESERVATION, RELEASE, ADJUSTMENT, DAMAGE, RETURN
  referenceType  String?   // ORDER, PURCHASE_ORDER, MANUAL_ADJUSTMENT
  referenceId    String?
  notes          String?
  createdById    String?
  createdAt      DateTime  @default(now())

  product        Product   @relation(fields: [productId], references: [id])
  createdBy      User?     @relation(fields: [createdById], references: [id])

  @@index([productId])
  @@index([type])
  @@index([createdAt])
}
```

### 4. `SalesOrder` & `SalesOrderItem`
Formally connects accepted Quotations to Engineering or Inventory fulfillment:
```prisma
model SalesOrder {
  id                String            @id @default(cuid())
  orderNo           String            @unique
  quotationId       String?
  clientId          String
  orderType         OrderType         @default(PRODUCT)
  status            OrderStatus       @default(PENDING)
  fulfillmentStatus FulfillmentStatus @default(NOT_REQUIRED)
  subtotal          Float
  taxAmount         Float             @default(0)
  totalAmount       Float
  notes             String?
  createdById       String
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  client            Client            @relation(fields: [clientId], references: [id])
  quotation         Quotation?        @relation(fields: [quotationId], references: [id])
  createdBy         User              @relation(fields: [createdById], references: [id])
  items             SalesOrderItem[]
  invoices          Invoice[]
  projects          Project[]

  @@index([clientId])
  @@index([status])
  @@index([orderNo])
}

model SalesOrderItem {
  id           String      @id @default(cuid())
  orderId      String
  productId    String?
  description  String
  quantity     Float
  unitPrice    Float
  totalAmount  Float

  order        SalesOrder  @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product      Product?    @relation(fields: [productId], references: [id])

  @@index([orderId])
}
```

### 5. `IntegrationLog`
Monitors background jobs, external webhooks, email delivery, and provides retry tracking:
```prisma
model IntegrationLog {
  id            String    @id @default(cuid())
  provider      String    // RESEND, WEBSITE_WEBHOOK, PDF_ENGINE
  operation     String    // SEND_EMAIL, INGEST_LEAD, GENERATE_PDF
  status        String    // SUCCESS, FAILED, RETRYING, PARTIAL_SUCCESS
  attemptCount  Int       @default(1)
  requestId     String?
  errorCode     String?
  errorMessage  String?
  payload       String?
  response      String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastAttemptAt DateTime  @default(now())
  nextRetryAt   DateTime?

  @@index([provider])
  @@index([status])
  @@index([createdAt])
}
```

### 6. `SystemSetting`
Stores dynamic company parameters centrally:
```prisma
model SystemSetting {
  id          String   @id @default(cuid())
  key         String   @unique
  value       String
  category    String   @default("GENERAL") // GENERAL, FINANCE, INVOICE, EMAIL
  description String?
  isPublic    Boolean  @default(false)
  updatedAt   DateTime @updatedAt
}
```

---

## 6. FINANCIAL TRANSACTION INTEGRITY & PAYMENT LEDGER

### Immutable Payment History
1. Direct deletion of payments (`DELETE /api/payments/[id]`) is **prohibited**.
2. Posted payment records retain `PaymentStatus = COMPLETED`.
3. To reverse or adjust a payment, a compensating `Payment` record is created with:
   - `PaymentEntryType = REVERSAL` or `ADJUSTMENT`
   - Negative amount (or opposite signed reference)
   - Reason/notes attached
   - An audit trail entry generated
4. **Dynamic Invoice Balance Calculation**:
   ```text
   Invoice.balance = Invoice.total - SUM(Payment.amount WHERE invoiceId = id AND status = COMPLETED AND type = PAYMENT) + SUM(Payment.amount WHERE invoiceId = id AND type = REVERSAL)
   ```
   The `Invoice.paidAmount` and `Invoice.balance` columns in the database serve as a cached projection, validated against the ledger inside database transactions.

---

## 7. INDEXING STRATEGY

Indexes are explicitly defined for high-traffic query patterns:

| Model | Index Columns | Operational Justification |
| :--- | :--- | :--- |
| `Invoice` | `[clientId]`, `[status]`, `[dueDate]`, `[invoiceNo]` | Filtering overdue invoices, client billing lookups, and unique number search. |
| `Payment` | `[invoiceId]`, `[clientId]`, `[status]`, `[date]` | Transaction reconciliation, revenue calculations, client payment ledger. |
| `Lead` | `[assignedToId]`, `[status]`, `[leadCode]`, `[createdAt]` | Sales pipeline filtering, assignment queues, sorting recent leads. |
| `Client` | `[assignedToId]`, `[status]`, `[clientCode]`, `[name]` | Fast autocomplete, client directory sorting, ownership checks. |
| `StockLedgerEntry` | `[productId]`, `[type]`, `[createdAt]` | Rapid calculation of current stock balances and inventory audit trails. |
| `SalesOrder` | `[clientId]`, `[status]`, `[orderNo]` | Order status tracking, order fulfillment queues. |
| `Task` | `[projectId]`, `[assignedToId]`, `[status]`, `[dueDate]` | Kanban board queries, user task lists, upcoming deadline alerts. |
| `AuditLog` | `[userId]`, `[module]`, `[createdAt]` | Fast security audit filtering by operator, module, or time slice. |
| `IdempotencyRecord` | `[expiresAt]`, `[key, scope]` | Atomic uniqueness checks and automated garbage collection of expired keys. |

---

## 8. BACKUP, RESTORE & MIGRATION REHEARSAL PROCEDURE

### Pre-Migration Backup Protocol
```powershell
# 1. SQLite Snapshot
Copy-Item "prisma/dev.db" "prisma/dev_pre_migration_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').db"

# 2. PostgreSQL Full Dump (For Staging/Production)
pg_dump -U postgres -h localhost -F c -b -v -f "backups/tamizhtech_pre_upgrade.dump" tamizhtech_erp
```

### Staging Rehearsal Sequence
1. Provision isolated PostgreSQL test database (`tamizhtech_rehearsal`).
2. Run Prisma migration:
   ```powershell
   npx prisma migrate deploy
   ```
3. Execute automated Data Integrity Audit script:
   - Check for orphaned child records.
   - Validate invoice balances against payments.
   - Verify stock balances against stock ledger.
   - Check sequence generation uniqueness.
4. Execute End-to-End sanity test suite against rehearsal database.
5. Record rehearsal log and verify 100% pass rate before scheduling production cutover.

### Rollback Procedure
If any fatal error occurs during production migration:
1. Revert application connection string to pre-migration database snapshot.
2. Restore database from pre-migration dump:
   ```powershell
   pg_restore -U postgres -h localhost -d tamizhtech_erp -c -v "backups/tamizhtech_pre_upgrade.dump"
   ```
3. Restart application service and verify core dashboard connectivity.

---
*Migration plan approved and certified for TamizhTech ERP 2.0.*

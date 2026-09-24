# TAMIZHTECH ERP 2.0 — SHARED WEBSITE + ERP BUSINESS ARCHITECTURE

## 1. Executive Summary & Core Rules

TamizhTech ERP is the authoritative operational backend for both internal ERP activities and external public website interactions.

```text
                  TAMIZHTECH WEBSITE
                         │
                         │ HTTPS POST
                         ▼
              /api/public/v1/submissions
                         │
              ┌──────────┴──────────┐
              │ Validation (Zod)    │
              │ Rate Limit (Edge/IP)│
              │ Idempotency Guard   │
              │ Security Sanitizer  │
              └──────────┬──────────┘
                         ▼
                 MongoDB Transaction
                  ┌───────────────┐
                  │ InboundSubm.  │
                  │ Outbox Events │
                  │ Audit Log     │
                  └───────┬───────┘
                          │
                       COMMIT
                          │
                          ▼
                    HTTP SUCCESS (201)
                          │
          ┌───────────────┼────────────────┐
          ▼               ▼                ▼
     Google Sheets   Customer Email   Admin Email
       sync event       event            event
          │               │                │
          └───────────────┼────────────────┘
                          ▼
                 Retry / Failure UI
                          │
                          ▼
                    ERP Dashboard
```

### Hierarchy of Authority:

```text
MongoDB / ERP   = AUTHORITATIVE SOURCE OF TRUTH
SubmissionEvent = AUTHORITATIVE SIDE-EFFECT STATE
Google Sheets   = SECONDARY REPORTING COPY (Reconcile before append via submissionNo)
Resend (Email)  = NOTIFICATION & COMMUNICATION CHANNEL
Redis           = OPTIONAL DISTRIBUTED RATE LIMITER & ACCELERATION CACHE
Vercel          = APPLICATION, SERVERLESS API & DEPLOYMENT HOST
```

---

## 2. Canonical Submission Entity (`InboundSubmission`)

External form submissions are captured through the canonical `InboundSubmission` model.

### Submission Types:
- `RFQ`: Request for Quotation (product requirements, quantity, budget, delivery timeline)
- `CONTACT`: General Inquiries, business requests, feedback
- `CAREER`: Job applications, qualifications, experience, resume attachments
- `CLUB_REGISTRATION`: Robotics club memberships, educational institutional signups

### Submission Status State Machines:
- **RFQ**: `NEW` → `IN_PROGRESS` → `CONTACTED` → `QUALIFIED` → `CONVERTED` / `CLOSED` / `REJECTED`
- **CONTACT**: `NEW` → `IN_PROGRESS` → `CONTACTED` → `CONVERTED` / `CLOSED` / `SPAM`
- **CAREER**: `NEW` → `UNDER_REVIEW` → `SHORTLISTED` → `CONTACTED` → `CLOSED` / `REJECTED`
- **CLUB_REGISTRATION**: `NEW` → `VERIFIED` → `CONTACTED` → `REGISTERED` → `CLOSED`

---

## 3. Atomic Sequence Numbering Architecture

External submissions utilize atomic, concurrency-safe database numbering backed by the existing `BusinessSequence` collection:

| Type | Format | Business Sequence Key |
|---|---|---|
| RFQ | `TTRC-RFQ-YYYY-XXXX` | `SUBMISSION_RFQ_{YYYY}` |
| CONTACT | `TTRC-CON-YYYY-XXXX` | `SUBMISSION_CON_{YYYY}` |
| CAREER | `TTRC-CAR-YYYY-XXXX` | `SUBMISSION_CAR_{YYYY}` |
| CLUB_REGISTRATION | `TTRC-CLUB-YYYY-XXXX` | `SUBMISSION_CLUB_{YYYY}` |

Sequence allocation occurs inside the MongoDB database transaction before commit, guaranteeing contiguous, collision-free numbering.

---

## 4. Idempotency & Concurrency Guarantees

Every public website submission requires a client-generated `idempotencyKey` (UUIDv4) and is fingerprinted by a SHA-256 `payloadHash`.
- Database constraint: `@unique` index on `InboundSubmission.idempotencyKey`.
- **Identical Request**: If `idempotencyKey` matches and normalized payload matches, returns existing submission with HTTP 200 and `isDuplicate: true` (zero duplicate side-effects).
- **Mismatched Request**: If `idempotencyKey` matches but the payload differs, returns **HTTP 409** with `IDEMPOTENCY_KEY_REUSE`, rejecting the request without side-effects.
- **Concurrent Collision Guard**: Catches MongoDB write conflicts/duplicate keys (P2002/P2034), resolves to the winning record with backoff retry polling, and returns HTTP 200 without creating duplicate database records, duplicate emails, or duplicate sheet rows.

---

## 5. Transactional Outbox & Serverless Side-Effects

To ensure reliability in a serverless environment (Vercel):
1. **Creation**: The submission, outbox events (`SubmissionEvent`), and initial audit log (`SubmissionAuditLog`) are committed in MongoDB.
2. **Side-Effect State Machine**:
   - Unique compound index: `@@unique([submissionId, eventType])`.
   - Atomic state transitions: `PENDING` → `PROCESSING` → `PROCESSED` (or `FAILED`).
   - Prevents duplicate worker execution.
3. **Stale Lease Recovery**: If an execution terminates prematurely while an event is in `PROCESSING`, any event where `lastAttemptAt` is older than `SUBMISSION_EVENT_STALE_TIMEOUT_MS` (default 5 minutes) is automatically reclaimed and retried.
4. **Execution**: Side-effects are invoked immediately in the serverless request lifecycle. Failures in side-effects (Sheets, Email) do **not** rollback the primary submission.
5. **Resilience**: Any failed event remains in `FAILED` status and can be retried individually via the Admin Dashboard or retry endpoint.


# TAMIZHTECH ERP 2.0 — GOOGLE SHEETS SYNCHRONIZATION ARCHITECTURE

## 1. Principles

Google Sheets serves strictly as a **secondary reporting copy**. MongoDB is the sole authoritative operational system.

```text
Public Website → ERP Public API → MongoDB Commit → Google Sheet Sync (Side-Effect)
```

Google Sheets never acts as the primary data store, and failures in Google Sheets synchronization never prevent a customer submission from being accepted.

---

## 2. Reconcile-Before-Append Mechanism

To prevent duplicate rows during serverless retries or network timeouts:

```text
Check SHEET_SYNC Event (Claim: PENDING → PROCESSING)
                  │
                  ▼
         Query Target Sheet by
     id = submissionNo (e.g. TTRC-RFQ-2026-0001)
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
    Row Found           Not Found
        │                   │
  UPDATE_ROW            APPEND_ROW
        │                   │
        └─────────┬─────────┘
                  ▼
     Mark Event = PROCESSED
```

### Key Guarantees:
1. **Stable Primary Key**: `submissionNo` is used as the unique row identifier (`id` column) in Google Sheets.
2. **Reconciliation**: If a previous sync timed out or worker crashed after appending, any subsequent retry queries the sheet first and updates the existing row instead of appending a duplicate.
3. **Dedicated Sheets per Type**:
   - `RFQs`
   - `Contacts`
   - `Careers`
   - `ClubRegistrations`

---

## 3. Synchronization States

| Status | Meaning | Action |
|---|---|---|
| `PENDING` | Initial state after MongoDB creation | Scheduled for immediate execution |
| `SYNCED` | Successfully appended or updated in Google Sheet | Complete, no further action |
| `FAILED` | Network timeout or script error | Logged with error; available for Admin retry |

---

## 4. Manual Retry Endpoint

- Admin can trigger re-sync from `/submissions` UI or via API:
  `POST /api/submissions/:id/retry-sync` with `{ "eventType": "SHEET_SYNC" }`.

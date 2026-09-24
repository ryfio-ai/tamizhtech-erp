# TAMIZHTECH ERP 2.0 — SUBMISSION EMAIL NOTIFICATION FLOW

## 1. Overview

Email notifications are managed strictly from the ERP server using **Resend**. Browser client code never interacts with email dispatch.

Every valid inbound website submission triggers two distinct email side-effects:
1. **Customer Thank-You / Acknowledgement Email**: Sent to applicant/customer if an email was provided.
2. **Internal Admin Notification Email**: Sent to internal operations team (`contact@tamizhtech.in`).

---

## 2. Delivery Guarantees & Resilience

```text
MongoDB Submission Committed (Status: NEW)
        │
        ├── SubmissionEvent (CUSTOMER_EMAIL) → Atomic Claim → Resend API
        │                                         └── Success → Status: PROCESSED
        │                                         └── Failure → Status: FAILED (logged)
        │
        └── SubmissionEvent (ADMIN_EMAIL)    → Atomic Claim → Resend API
                                                  └── Success → Status: PROCESSED
                                                  └── Failure → Status: FAILED (logged)
```

1. **Non-Blocking Execution**: Email delivery failures never roll back or invalidate a saved MongoDB submission.
2. **Side-Effect State Machine**:
   - Unique event record: `@@unique([submissionId, "CUSTOMER_EMAIL"])` and `@@unique([submissionId, "ADMIN_EMAIL"])`.
   - Event status transitions from `PENDING` to `PROCESSING` via atomic claim, preventing duplicate emails during serverless retries or concurrent requests.
3. **Idempotency Protection**: Before dispatching, the event state is checked. If already `PROCESSED`, dispatch is skipped.
4. **Stale Lease Recovery**: If a serverless function invocation crashes after moving an event to `PROCESSING`, events with `lastAttemptAt` older than the configured timeout (`SUBMISSION_EVENT_STALE_TIMEOUT_MS`, default 5 minutes) become eligible for atomic re-claim, preventing permanently stuck events.

---

## 3. Email Templates

### 3.1 Customer Thank-You Templates
- **RFQ**: Acknowledges request, quotes reference number (`TTRC-RFQ-YYYY-XXXX`), summarizes product requirements, states that sales engineering will prepare formal quotation.
- **Contact**: Acknowledges message, quotes reference number (`TTRC-CON-YYYY-XXXX`), sets 24 business hours expectation.
- **Career**: Acknowledges application, quotes reference number (`TTRC-CAR-YYYY-XXXX`), states HR profile review.
- **Club Registration**: Welcomes member to robotics community, quotes reference number (`TTRC-CLUB-YYYY-XXXX`), notes future orientation details.

### 3.2 Internal Admin Notification
Includes:
- Submission Type (`RFQ`, `CONTACT`, `CAREER`, `CLUB_REGISTRATION`)
- Reference ID (`TTRC-...`)
- Contact details (Name, Mobile, Email, Company, City, State)
- Domain payload parameters (Product requirements, quantity, budget, resume metadata, institution)
- Timestamp formatted in `Asia/Kolkata`
- Direct deep-link to ERP admin submission view (`${ERP_PUBLIC_URL}/submissions`, e.g., `https://erp.tamizhtech.in/submissions`)


---

## 4. Manual Retry Flow

If Resend API is temporarily down or credentials require renewal:
1. The submission event is marked as `FAILED` in MongoDB.
2. The ERP Admin Dashboard highlights the submission with a "Retry Email" button.
3. Admin clicks "Retry Email", resetting event to `PENDING` and executing atomic re-dispatch.

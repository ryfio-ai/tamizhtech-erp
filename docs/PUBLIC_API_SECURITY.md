# TAMIZHTECH ERP 2.0 — PUBLIC API SECURITY SPECIFICATION

## 1. Security Overview

The public submission APIs (`/api/public/v1/submissions` and `/api/public/v1/uploads`) are intentionally designed for public internet exposure while isolating all ERP administrative internals.

---

## 2. Multi-Layer Defense Matrix

| Security Layer | Implementation Mechanism | Enforcement |
|---|---|---|
| **Rate Limiting** | Upstash Redis distributed token bucket (Edge/Serverless) + In-memory fallback | Max 10 reqs/min per IP |
| **Payload Size Limits** | Header & stream inspection | Max 1MB (Submissions), Max 5MB (Uploads) |
| **Content-Type Validation** | Strict `application/json` / `multipart/form-data` | Rejects non-compliant types with HTTP 415 |
| **CORS Policy** | `PUBLIC_ALLOWED_ORIGINS` environment configuration | Restricts cross-origin requests to authorized origins |
| **Input Sanitization** | HTML tag stripping, ASCII control character removal | Prevents injection & stored XSS |
| **Schema Validation** | Zod schemas with strict type constraints | Rejects unexpected or malicious properties |
| **Database Idempotency** | MongoDB `@unique` index on `idempotencyKey` + SHA-256 `payloadHash` | Deduplication; mismatched payload rejects with HTTP 409 |
| **Safe Error Handling** | Sanitized user-facing error messages | Stack traces and database internals never exposed |
| **File Isolation** | Vercel Private Blob (`access: 'private'`) | Resumes never exposed via public URLs |
| **Source Control** | Server-enforced `source = "WEBSITE"` | Client cannot spoof source in reporting |
| **Upload Ownership** | Token ownership check via `PendingAttachment` | Uploads tied to idempotencyKey; orphans purged after 2h |


---

## 3. Career Attachment Security Architecture

1. **Vercel Private Blob Storage**:
   - Files are stored in Vercel Private Blob with private access (`access: 'private'`).
   - Files cannot be directly browsed, scraped, or linked over public HTTP.
2. **Upload Ownership & Claim**:
   - Every uploaded file is associated with the client's `idempotencyKey` in the `PendingAttachment` collection.
   - When the final Career submission is created, the upload is claimed and marked as `ATTACHED`.
   - Files cannot be hijacked or attached to a different submission.
   - Unattached uploads expire after 2 hours and are safely purged (`cleanupExpiredUploads()`).
3. **Access Control**:
   - Resumes can only be downloaded by authenticated ERP users via:
     `GET /api/submissions/:id/attachment/:key`
   - Access is denied (HTTP 401/403) if the requester lacks an active ERP session or if the `storageKey` does not belong to the requested submission.
4. **MIME Type & Extension Whitelist**:
   - Only `application/pdf`, `application/msword`, and `application/vnd.openxmlformats-officedocument.wordprocessingml.document` are accepted.
   - Executables (`.exe`, `.sh`, `.bat`, `.js`) are strictly rejected.

---

## 4. Error Message Sanitization

Under no circumstances do public endpoints leak:
- MongoDB connection strings or replica set details
- Prisma internal errors or stack traces
- Internal filesystem paths
- Server configuration or environment variables

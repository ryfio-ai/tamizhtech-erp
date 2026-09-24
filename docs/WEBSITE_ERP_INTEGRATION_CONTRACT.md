# TAMIZHTECH ERP 2.0 — WEBSITE TO ERP INTEGRATION CONTRACT

This contract specifies the stable HTTP API boundary between the TamizhTech public website and the central TamizhTech ERP.

---

## 1. Endpoints Overview

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/public/v1/submissions` | Canonical Inbound Form Intake | Public (Rate Limited) |
| `POST` | `/api/public/submissions` | Alias to v1 Intake | Public (Rate Limited) |
| `POST` | `/api/public/v1/uploads` | Secure Resume File Upload | Public (Rate Limited) |
| `OPTIONS` | `/api/public/v1/*` | CORS Preflight Handler | None |

---

## 2. Public Submission Intake (`POST /api/public/v1/submissions`)

### Request Headers
```http
Content-Type: application/json
Origin: https://tamizhtech.in
```

### Request Envelope Schema
```json
{
  "type": "RFQ",
  "idempotencyKey": "c1f7a2d8-9411-4a7b-a3d8-e3288f551b9e",
  "source": "WEBSITE",
  "payload": { ... }
}
```
> **Note on Source Tracking**: The `source` field is strictly server-controlled. For all submissions arriving via `/api/public/v1/submissions`, the ERP automatically sets and normalizes `source = "WEBSITE"`. Client-supplied spoofed values are ignored.

### Supported Submission Types
- `RFQ`: Request for Quotation
- `CONTACT`: General Inquiry & Contact Us
- `CAREER`: Employment & Internship Application
- `CLUB_REGISTRATION`: Robotics Club & Workshop Signups

---

## 3. Domain Payload Specifications

### 3.1 RFQ Payload
```json
{
  "name": "Arun Kumar",
  "mobile": "9876543210",
  "email": "arun@innovations.com",
  "company": "Arun Automations Pvt Ltd",
  "city": "Coimbatore",
  "state": "Tamil Nadu",
  "country": "India",
  "subject": "Inquiry for 6-Axis Robotic Arm",
  "message": "Need delivery to our manufacturing unit by end of quarter.",
  "productRequirements": "6-Axis Articulated Industrial Robot Arm with Payload 10kg",
  "quantity": 2,
  "configurationRequirements": "Integrated gripper with pneumatic controller",
  "technicalRequirements": "ROS2 compatibility, IP65 ingress protection",
  "budget": "INR 15 - 20 Lakhs",
  "deliveryTimeline": "4 Weeks"
}
```

### 3.2 Contact Payload
```json
{
  "name": "Kavitha R",
  "mobile": "9876511223",
  "email": "kavitha@example.com",
  "company": "Tech Solutions",
  "city": "Chennai",
  "state": "Tamil Nadu",
  "subject": "Robotics Training Workshop Inquiry",
  "message": "We would like to organize an industrial IoT and robotics training session for our engineering team."
}
```

### 3.3 Career Payload
```json
{
  "name": "Suresh Babu",
  "mobile": "9845012345",
  "email": "suresh.babu@gmail.com",
  "position": "Embedded Robotics Engineer",
  "qualification": "B.E. Mechatronics",
  "experience": "3 Years",
  "location": "Coimbatore",
  "coverMessage": "Experienced in STM32, ROS, and motion control algorithms.",
  "attachmentMetadata": {
    "storageKey": "resume_1710000000_abc123.pdf",
    "fileName": "Suresh_Babu_Resume.pdf",
    "mimeType": "application/pdf",
    "size": 245120,
    "checksum": "d41d8cd98f00b204e9800998ecf8427e"
  }
}
```

### 3.4 Club Registration Payload
```json
{
  "name": "Praveen S",
  "mobile": "9944098765",
  "email": "praveen.robotics@college.edu",
  "institution": "PSG College of Technology",
  "department": "Mechanical Engineering",
  "year": "3rd Year",
  "city": "Coimbatore",
  "state": "Tamil Nadu",
  "interests": ["Combat Robotics", "Autonomous Rovers", "Drone Technology"],
  "message": "Interested in participating in national level robotics hackathons."
}
```

---

## 4. Response Schema

### Success Response (`201 Created` or `200 OK` on duplicate)
```json
{
  "success": true,
  "submissionNo": "TTRC-RFQ-2026-0001",
  "message": "Your request has been received successfully."
}
```

### Error Responses
- `400 Bad Request`: Validation failure:
  ```json
  {
    "success": false,
    "error": "mobile: Either mobile number or email address must be provided"
  }
  ```
- `409 Conflict`: Idempotency key reused with a different payload:
  ```json
  {
    "success": false,
    "error": "Idempotency key reuse with different payload is not allowed.",
    "code": "IDEMPOTENCY_KEY_REUSE"
  }
  ```
- `413 Payload Too Large`: Payload exceeds 1MB limit.
- `429 Too Many Requests`: Exceeded 10 requests per minute limit per IP.
- `500 Internal Server Error`: Generic safe message (no internal credentials or stack traces).


---

## 5. File Upload API (`POST /api/public/v1/uploads`)

- Used for Career resume uploads before final form submission.
- Accepts `multipart/form-data`:
  - `file`: Resume file (PDF, DOC, DOCX, max 5MB).
  - `idempotencyKey`: Client-generated submission token to establish upload ownership.
- **Storage Strategy**: Vercel Private Blob (`access: 'private'`).
- Returns metadata with unique `storageKey`:
  ```json
  {
    "success": true,
    "attachment": {
      "storageKey": "resume_1710000000_abc123.pdf",
      "fileName": "Resume.pdf",
      "mimeType": "application/pdf",
      "size": 102400,
      "checksum": "..."
    }
  }
  ```
- **Ownership Enforcement**: When the Career submission is created with `idempotencyKey`, the ERP claims and attaches the pending upload. A resume upload cannot be hijacked or reused across different submissions.
- **Orphan Cleanup**: Unattached uploads expire after 2 hours and are safely purged. Uploads attached to valid submissions are preserved permanently.
- **Access Control**: Candidate resumes are never publicly accessible. Authenticated ERP users access resumes via `GET /api/submissions/[id]/attachment/[key]`.


import { z } from "zod";
import { normalizeMobile, isValidMobile } from "@/lib/phone";

// ─── Input Sanitization Utility ─────────────────────────────────────
export function sanitizeString(val: unknown): string {
  if (typeof val !== "string") return "";
  return val
    .replace(/<[^>]*>?/gm, "") // strip HTML tags
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, "") // strip control characters
    .trim();
}

// ─── Domain Payload Schemas ─────────────────────────────────────────

export const rfqPayloadSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(120),
  mobile: z.string().optional().nullable(),
  email: z.string().email("Valid email address required").optional().nullable(),
  company: z.string().max(150).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).default("India"),
  subject: z.string().max(200).optional().nullable(),
  message: z.string().max(4000).optional().nullable(),
  
  // Specific RFQ fields
  productRequirements: z.string().max(2000).optional().nullable(),
  quantity: z.union([z.number(), z.string()]).optional().nullable(),
  configurationRequirements: z.string().max(2000).optional().nullable(),
  technicalRequirements: z.string().max(2000).optional().nullable(),
  budget: z.string().max(100).optional().nullable(),
  deliveryTimeline: z.string().max(100).optional().nullable(),
  attachmentReferences: z.any().optional().nullable(),
}).refine(data => data.mobile || data.email, {
  message: "Either mobile number or email address must be provided",
  path: ["mobile"]
});

export const contactPayloadSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(120),
  mobile: z.string().optional().nullable(),
  email: z.string().email("Valid email address required").optional().nullable(),
  company: z.string().max(150).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).default("India"),
  subject: z.string().max(200).optional().nullable(),
  message: z.string().min(3, "Message must be at least 3 characters").max(4000),
}).refine(data => data.mobile || data.email, {
  message: "Either mobile number or email address must be provided",
  path: ["email"]
});

export const careerPayloadSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(120),
  mobile: z.string().min(5, "Mobile number required"),
  email: z.string().email("Valid email address required"),
  position: z.string().min(2, "Position applied for is required").max(150),
  qualification: z.string().max(150).optional().nullable(),
  experience: z.string().max(100).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  coverMessage: z.string().max(4000).optional().nullable(),
  
  // Resume metadata (stored securely, not binary in mongo)
  attachmentMetadata: z.object({
    storageKey: z.string().min(1, "Storage key is required"),
    fileName: z.string().min(1),
    mimeType: z.string().min(1),
    size: z.number().max(5 * 1024 * 1024, "Max file size is 5MB"),
    checksum: z.string().optional().nullable(),
  }).optional().nullable(),
});

export const clubRegistrationPayloadSchema = z.object({
  name: z.string().min(2, "Student/Member name is required").max(120),
  mobile: z.string().min(5, "Mobile number required"),
  email: z.string().email("Valid email address required"),
  institution: z.string().min(2, "Institution / College name is required").max(200),
  department: z.string().max(150).optional().nullable(),
  year: z.string().max(50).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  interests: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  message: z.string().max(2000).optional().nullable(),
});

export const submissionEnvelopeSchema = z.object({
  type: z.enum(["RFQ", "CONTACT", "CAREER", "CLUB_REGISTRATION"]),
  idempotencyKey: z.string().min(8, "idempotencyKey must be at least 8 characters").max(128),
  payload: z.record(z.any()),
  source: z.string().max(50).default("WEBSITE"),
});

// ─── Domain State Machine Validation ─────────────────────────────────

export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  RFQ: ["NEW", "IN_PROGRESS", "CONTACTED", "QUALIFIED", "CONVERTED", "CLOSED", "REJECTED"],
  CONTACT: ["NEW", "IN_PROGRESS", "CONTACTED", "CONVERTED", "CLOSED", "SPAM"],
  CAREER: ["NEW", "UNDER_REVIEW", "SHORTLISTED", "CONTACTED", "CLOSED", "REJECTED"],
  CLUB_REGISTRATION: ["NEW", "VERIFIED", "CONTACTED", "REGISTERED", "CLOSED"],
};

export function isValidStatusForType(type: string, status: string): boolean {
  const allowed = VALID_STATUS_TRANSITIONS[type];
  if (!allowed) return false;
  return allowed.includes(status);
}

export function validateAndParseSubmission(type: string, rawPayload: any) {
  switch (type) {
    case "RFQ":
      return rfqPayloadSchema.parse(rawPayload);
    case "CONTACT":
      return contactPayloadSchema.parse(rawPayload);
    case "CAREER":
      return careerPayloadSchema.parse(rawPayload);
    case "CLUB_REGISTRATION":
      return clubRegistrationPayloadSchema.parse(rawPayload);
    default:
      throw new Error(`Unsupported submission type: ${type}`);
  }
}

// ─── Payload Fingerprint / Hashing for Idempotency ─────────────────────

export function normalizeAndHashPayload(type: string, rawPayload: any): string {
  function deepNormalize(val: any): any {
    if (val === null || val === undefined) return null;
    if (typeof val === "string") return val.trim();
    if (typeof val === "number" || typeof val === "boolean") return val;
    if (Array.isArray(val)) return val.map(deepNormalize);
    if (typeof val === "object") {
      const sortedKeys = Object.keys(val).sort();
      const res: Record<string, any> = {};
      for (const k of sortedKeys) {
        if (val[k] !== undefined) {
          res[k] = deepNormalize(val[k]);
        }
      }
      return res;
    }
    return val;
  }

  const normalized = deepNormalize(rawPayload);
  const serialized = JSON.stringify({ type, payload: normalized });
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(serialized).digest("hex");
}


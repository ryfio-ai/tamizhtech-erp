import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { allocateSubmissionNoTx } from "@/lib/sequence";
import { normalizeMobile } from "@/lib/phone";
import {
  submissionEnvelopeSchema,
  validateAndParseSubmission,
  sanitizeString,
  normalizeAndHashPayload,
} from "@/lib/validations/submissions";
import { checkSubmissionRateLimit, extractClientIp } from "@/lib/security/submissionRateLimit";
import { processAllSubmissionSideEffects } from "@/lib/outbox/submissionOutbox";
import { invalidateCachePrefix } from "@/lib/cache";
import { z } from "zod";

export const revalidate = 0;

function getCorsHeaders(req: NextRequest) {
  const allowedOriginsEnv =
    process.env.PUBLIC_ALLOWED_ORIGINS ||
    "http://localhost:3000,http://localhost:3001,https://tamizhtech.in,https://www.tamizhtech.in";
  const allowedOrigins = allowedOriginsEnv.split(",").map((o) => o.trim().toLowerCase());
  const origin = (req.headers.get("origin") || "").toLowerCase();

  const isAllowed = allowedOrigins.includes(origin) || process.env.NODE_ENV === "development";
  const allowOrigin = isAllowed && origin ? req.headers.get("origin")! : allowedOrigins[0] || "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-idempotency-key",
    "Access-Control-Max-Age": "86400",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}

export async function POST(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);

  try {
    // 1. Rate Limiting Defense
    const ip = extractClientIp(req);
    const rateCheck = await checkSubmissionRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many requests. Rate limit is 10 requests per minute per IP.",
          code: "RATE_LIMIT_EXCEEDED",
        },
        { status: 429, headers: corsHeaders }
      );
    }

    // 2. Payload Size & Header Verification
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "Payload exceeds 1MB limit." },
        { status: 413, headers: corsHeaders }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { success: false, error: "Content-Type must be application/json." },
        { status: 415, headers: corsHeaders }
      );
    }

    // 3. Parse JSON Body
    let rawBody: any;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Malformed JSON payload." },
        { status: 400, headers: corsHeaders }
      );
    }

    // 4. Envelope Validation
    const envelope = submissionEnvelopeSchema.parse(rawBody);
    const { type, idempotencyKey, payload, source } = envelope;

    // Calculate normalized payload hash
    const payloadHash = normalizeAndHashPayload(type, payload);

    // 5. Database-authoritative Idempotency Check (pre-flight)
    const existingSubmission = await prisma.inboundSubmission.findUnique({
      where: { idempotencyKey },
    });

    if (existingSubmission) {
      if (existingSubmission.payloadHash && existingSubmission.payloadHash !== payloadHash) {
        return NextResponse.json(
          {
            success: false,
            error: "Idempotency key reuse with different payload is not allowed.",
            code: "IDEMPOTENCY_KEY_REUSE",
          },
          { status: 409, headers: corsHeaders }
        );
      }
      console.log(`[IDEMPOTENT_SUBMISSION] Returning existing submission ${existingSubmission.submissionNo} for key ${idempotencyKey}`);
      return NextResponse.json(
        {
          success: true,
          submissionNo: existingSubmission.submissionNo,
          message: "Your request has been received.",
          isDuplicate: true,
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // 6. Domain-specific Payload Validation & Sanitization
    const validatedPayload = validateAndParseSubmission(type, payload);

    // Sanitize string inputs
    const name = sanitizeString(validatedPayload.name);
    const rawMobile = (validatedPayload as any).mobile ? sanitizeString((validatedPayload as any).mobile) : null;
    const mobileNormalized = rawMobile ? normalizeMobile(rawMobile) : null;
    const email = (validatedPayload as any).email ? sanitizeString((validatedPayload as any).email).toLowerCase() : null;
    const company = (validatedPayload as any).company ? sanitizeString((validatedPayload as any).company) : null;
    const city = (validatedPayload as any).city ? sanitizeString((validatedPayload as any).city) : null;
    const state = (validatedPayload as any).state ? sanitizeString((validatedPayload as any).state) : null;
    const country = (validatedPayload as any).country ? sanitizeString((validatedPayload as any).country) : "India";
    const subject = (validatedPayload as any).subject ? sanitizeString((validatedPayload as any).subject) : null;
    const message = (validatedPayload as any).message ? sanitizeString((validatedPayload as any).message) : null;
    const attachmentMetadata = (validatedPayload as any).attachmentMetadata || null;

    // Verify upload ownership if resume is attached
    if (type === "CAREER" && attachmentMetadata?.storageKey) {
      const { claimAndAttachUpload } = await import("@/lib/storage/submissionStorage");
      const claimed = await claimAndAttachUpload(idempotencyKey, attachmentMetadata.storageKey);
      if (!claimed) {
        return NextResponse.json(
          {
            success: false,
            error: "Resume attachment ownership verification failed. The upload token does not match this submission.",
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // 7. Atomic Database Creation with Concurrency-Safe Sequence & Idempotency
    let createdSubmission: any;

    try {
      createdSubmission = await prisma.$transaction(async (tx) => {
        const submissionNo = await allocateSubmissionNoTx(tx, type as any);

        const sub = await tx.inboundSubmission.create({
          data: {
            submissionNo,
            type: type as any,
            status: "NEW",
            source: "WEBSITE", // Server-controlled: NEVER trust client-provided source
            idempotencyKey,
            payloadHash,
            name,
            mobile: rawMobile,
            mobileNormalized,
            email,
            company,
            city,
            state,
            country,
            subject,
            message,
            payload: validatedPayload,
            attachmentMetadata,
            sheetSyncStatus: "PENDING",
            customerEmailStatus: "PENDING",
            adminEmailStatus: "PENDING",
          },
        });

        // Initial Audit Log
        await tx.submissionAuditLog.create({
          data: {
            submissionId: sub.id,
            action: "SUBMISSION_CREATED",
            actorType: "PUBLIC",
            performedByName: name || "Website Visitor",
            details: {
              source: sub.source,
              type: sub.type,
              submissionNo: sub.submissionNo,
            },
          },
        });

        return sub;
      });
    } catch (err: any) {
      // Catch race condition if exact same idempotencyKey was inserted concurrently
      // Or if a concurrent transaction caused a write conflict (P2034)
      for (let attempt = 0; attempt < 4; attempt++) {
        const concurrentMatch = await prisma.inboundSubmission.findUnique({
          where: { idempotencyKey },
        });

        if (concurrentMatch) {
          if (concurrentMatch.payloadHash && concurrentMatch.payloadHash !== payloadHash) {
            return NextResponse.json(
              {
                success: false,
                error: "Idempotency key reuse with different payload is not allowed.",
                code: "IDEMPOTENCY_KEY_REUSE",
              },
              { status: 409, headers: corsHeaders }
            );
          }
          return NextResponse.json(
            {
              success: true,
              submissionNo: concurrentMatch.submissionNo,
              message: "Your request has been received.",
              isDuplicate: true,
            },
            { status: 200, headers: corsHeaders }
          );
        }

        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 120 * (attempt + 1)));
        }
      }

      console.error("[SUBMISSION_CREATE_TRANSACTION_ERROR]:", err);
      throw err;
    }

    // Invalidate dashboard counters cache
    await invalidateCachePrefix("submissions:");
    await invalidateCachePrefix("dashboard:");

    // 8. Execute Side-Effects (Sheets sync & Emails)
    // Runs within the serverless request lifecycle; errors do not rollback createdSubmission
    processAllSubmissionSideEffects(createdSubmission).catch((sideEffectErr) => {
      console.error("[SIDE_EFFECTS_ORCHESTRATION_WARN]:", sideEffectErr);
    });

    // 9. Clean Public Response
    return NextResponse.json(
      {
        success: true,
        submissionNo: createdSubmission.submissionNo,
        message: "Your request has been received successfully.",
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const issue = error.errors[0];
      const errorMessage = issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed";
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400, headers: corsHeaders }
      );
    }

    console.error("[PUBLIC_SUBMISSION_EXCEPTION]:", error?.message);

    return NextResponse.json(
      { success: false, error: "Unable to process submission. Please try again later." },
      { status: 500, headers: corsHeaders }
    );
  }
}

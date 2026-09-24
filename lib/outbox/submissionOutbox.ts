import prisma from "@/lib/prisma";
import { syncSubmissionToSheet } from "@/lib/integrations/googleSheetsService";
import { sendCustomerThankYouEmail, sendAdminNotificationEmail } from "@/lib/email/submissionEmails";

export type OutboxEventType = "SHEET_SYNC" | "CUSTOMER_EMAIL" | "ADMIN_EMAIL";

/**
 * Initializes the authoritative outbox events inside or right alongside the creation transaction.
 */
export async function initializeSubmissionEvents(submissionId: string) {
  const events: OutboxEventType[] = ["SHEET_SYNC", "CUSTOMER_EMAIL", "ADMIN_EMAIL"];

  for (const eventType of events) {
    await prisma.submissionEvent.upsert({
      where: {
        submissionId_eventType: {
          submissionId,
          eventType,
        },
      },
      create: {
        submissionId,
        eventType,
        status: "PENDING",
        retryCount: 0,
      },
      update: {}, // Keep existing state if already created
    });
  }
}

/**
 * Configurable stale event lease timeout.
 * Default: 5 minutes (300,000 ms).
 * If a serverless worker crashes after claiming an event (PENDING -> PROCESSING),
 * the event becomes eligible for recovery once lastAttemptAt is older than this threshold.
 */
export const STALE_EVENT_TIMEOUT_MS = parseInt(
  process.env.SUBMISSION_EVENT_STALE_TIMEOUT_MS || `${5 * 60 * 1000}`,
  10
);

/**
 * Atomically claims an event for processing.
 * Only transitions to "PROCESSING" if:
 * 1. Currently "PENDING" or "FAILED", OR
 * 2. Currently "PROCESSING" but lastAttemptAt is older than staleTimeoutMs (recovery from crashed worker).
 * Never claims if "PROCESSED".
 * Prevents concurrent duplicate worker execution.
 */
export async function claimEventForProcessing(
  submissionId: string,
  eventType: OutboxEventType,
  staleTimeoutMs = STALE_EVENT_TIMEOUT_MS
): Promise<boolean> {
  try {
    const staleCutoff = new Date(Date.now() - staleTimeoutMs);

    const res = await prisma.submissionEvent.updateMany({
      where: {
        submissionId,
        eventType,
        OR: [
          { status: { in: ["PENDING", "FAILED"] } },
          {
            status: "PROCESSING",
            lastAttemptAt: { lte: staleCutoff },
          },
        ],
      },
      data: {
        status: "PROCESSING",
        lastAttemptAt: new Date(),
      },
    });

    return res.count > 0;
  } catch (err) {
    console.error(`[EVENT_CLAIM_ERROR] ${submissionId} - ${eventType}:`, err);
    return false;
  }
}


/**
 * Executes a single side-effect event with atomic claim protection.
 */
export async function processSubmissionEvent(
  submission: any,
  eventType: OutboxEventType
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  const claimed = await claimEventForProcessing(submission.id, eventType);
  if (!claimed) {
    console.log(`[EVENT_SKIP] Event ${eventType} for ${submission.submissionNo} already claimed or processed.`);
    return { success: true, skipped: true };
  }

  let success = false;
  let errorMessage: string | undefined;

  try {
    if (eventType === "SHEET_SYNC") {
      const result = await syncSubmissionToSheet(submission);
      success = result.success;
      errorMessage = result.error;
    } else if (eventType === "CUSTOMER_EMAIL") {
      const result = await sendCustomerThankYouEmail(submission);
      success = result.success;
      errorMessage = result.error;
    } else if (eventType === "ADMIN_EMAIL") {
      const result = await sendAdminNotificationEmail(submission);
      success = result.success;
      errorMessage = result.error;
    }
  } catch (err: any) {
    success = false;
    errorMessage = err?.message || "Unexpected side-effect exception";
  }

  // Authoritative Event State Update
  const newStatus = success ? "PROCESSED" : "FAILED";

  await prisma.submissionEvent.update({
    where: {
      submissionId_eventType: {
        submissionId: submission.id,
        eventType,
      },
    },
    data: {
      status: newStatus,
      processedAt: success ? new Date() : null,
      error: errorMessage || null,
      retryCount: { increment: 1 },
      updatedAt: new Date(),
    },
  });

  // Fast Projection Update on InboundSubmission
  const syncStatusVal = success ? "SYNCED" : "FAILED";
  const updateData: Record<string, any> = {};

  if (eventType === "SHEET_SYNC") {
    updateData.sheetSyncStatus = syncStatusVal;
    updateData.sheetSyncedAt = success ? new Date() : null;
    updateData.sheetSyncError = errorMessage || null;
  } else if (eventType === "CUSTOMER_EMAIL") {
    updateData.customerEmailStatus = syncStatusVal;
    updateData.customerEmailSentAt = success ? new Date() : null;
    updateData.customerEmailError = errorMessage || null;
  } else if (eventType === "ADMIN_EMAIL") {
    updateData.adminEmailStatus = syncStatusVal;
    updateData.adminEmailSentAt = success ? new Date() : null;
    updateData.adminEmailError = errorMessage || null;
  }

  await prisma.inboundSubmission.update({
    where: { id: submission.id },
    data: updateData,
  }).catch((e) => console.warn("[PROJECTION_UPDATE_WARN]:", e.message));

  return { success, error: errorMessage };
}

/**
 * Orchestrates all side-effect events for a freshly created submission.
 * Designed to be called immediately within the serverless request lifecycle.
 */
export async function processAllSubmissionSideEffects(submission: any) {
  await initializeSubmissionEvents(submission.id);

  // Execute events in parallel or orderly fashion
  const results = await Promise.allSettled([
    processSubmissionEvent(submission, "SHEET_SYNC"),
    processSubmissionEvent(submission, "CUSTOMER_EMAIL"),
    processSubmissionEvent(submission, "ADMIN_EMAIL"),
  ]);

  return results;
}

/**
 * Manual retry for a single failed event by admin.
 */
export async function retrySubmissionEvent(submissionId: string, eventType: OutboxEventType) {
  const submission = await prisma.inboundSubmission.findUnique({
    where: { id: submissionId },
    include: { events: true },
  });

  if (!submission) {
    throw new Error("Submission not found");
  }

  // Reset event status to PENDING so it can be claimed
  await prisma.submissionEvent.update({
    where: {
      submissionId_eventType: {
        submissionId,
        eventType,
      },
    },
    data: {
      status: "PENDING",
      error: null,
    },
  });

  const res = await processSubmissionEvent(submission, eventType);

  // Log audit entry for manual retry
  await prisma.submissionAuditLog.create({
    data: {
      submissionId,
      action: "EVENT_RETRIED",
      actorType: "ADMIN",
      performedByName: "Admin",
      details: {
        eventType,
        success: res.success,
        error: res.error,
      },
    },
  }).catch(() => {});

  return res;
}

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { retrySubmissionEvent, OutboxEventType } from "@/lib/outbox/submissionOutbox";

export const revalidate = 0;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { eventType } = body;

    const submission = await prisma.inboundSubmission.findUnique({
      where: { id },
      include: { events: true },
    });

    if (!submission) {
      return NextResponse.json({ success: false, error: "Submission not found" }, { status: 404 });
    }

    const validEventTypes: OutboxEventType[] = ["SHEET_SYNC", "CUSTOMER_EMAIL", "ADMIN_EMAIL"];

    if (eventType) {
      if (!validEventTypes.includes(eventType)) {
        return NextResponse.json(
          { success: false, error: `Invalid eventType. Allowed: ${validEventTypes.join(", ")}` },
          { status: 400 }
        );
      }

      const res = await retrySubmissionEvent(id, eventType as OutboxEventType);
      return NextResponse.json({
        success: res.success,
        data: res,
        message: res.success ? `Event ${eventType} retried successfully.` : `Event retry failed: ${res.error}`,
      });
    }

    // If no specific eventType provided, retry all events currently in FAILED status
    const failedEvents = submission.events.filter((e) => e.status === "FAILED");
    if (failedEvents.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No failed events found for this submission.",
      });
    }

    const retryResults: Record<string, any> = {};
    for (const fe of failedEvents) {
      retryResults[fe.eventType] = await retrySubmissionEvent(id, fe.eventType as OutboxEventType);
    }

    return NextResponse.json({
      success: true,
      data: retryResults,
      message: `Retried ${failedEvents.length} failed events.`,
    });
  } catch (error: any) {
    console.error("[SUBMISSION_RETRY_SYNC_ERROR]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

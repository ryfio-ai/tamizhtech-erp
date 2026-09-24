import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isValidStatusForType } from "@/lib/validations/submissions";
import { invalidateCachePrefix } from "@/lib/cache";

export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const submission = await prisma.inboundSubmission.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, clientCode: true, name: true, phone: true } },
        lead: { select: { id: true, leadCode: true, status: true } },
        events: { orderBy: { createdAt: "asc" } },
        auditLogs: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!submission) {
      return NextResponse.json({ success: false, error: "Submission not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: submission });
  } catch (error: any) {
    console.error("[SUBMISSION_DETAIL_ERROR]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { status, assignedToId } = body;

    const existing = await prisma.inboundSubmission.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Submission not found" }, { status: 404 });
    }

    const updateData: any = {};
    const auditActions: Array<{ action: string; details: any }> = [];

    if (status !== undefined) {
      if (!isValidStatusForType(existing.type, status)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid status '${status}' for submission type '${existing.type}'.`,
          },
          { status: 400 }
        );
      }

      if (status !== existing.status) {
        updateData.status = status;
        auditActions.push({
          action: "STATUS_CHANGED",
          details: { previousStatus: existing.status, newStatus: status },
        });
      }
    }

    if (assignedToId !== undefined) {
      updateData.assignedToId = assignedToId || null;
      auditActions.push({
        action: "ASSIGNED",
        details: { assignedToId: assignedToId || null },
      });
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true, data: existing });
    }

    const user = session.user as any;

    const updated = await prisma.$transaction(async (tx) => {
      const sub = await tx.inboundSubmission.update({
        where: { id },
        data: updateData,
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          client: { select: { id: true, clientCode: true, name: true } },
          events: true,
        },
      });

      for (const audit of auditActions) {
        await tx.submissionAuditLog.create({
          data: {
            submissionId: id,
            action: audit.action,
            actorType: "ADMIN",
            performedByUserId: user?.id || null,
            performedByName: user?.name || user?.email || "ERP Admin",
            details: audit.details,
          },
        });
      }

      return sub;
    });

    await invalidateCachePrefix("submissions:");

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[SUBMISSION_PATCH_ERROR]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

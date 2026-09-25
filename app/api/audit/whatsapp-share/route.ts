import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { entityType, entityId, recipientPhone, recipientName, documentNo } = body;

    if (!entityId || !recipientPhone) {
      return NextResponse.json(
        { success: false, error: "entityId and recipientPhone are required" },
        { status: 400 }
      );
    }

    const userId = (session.user as any)?.id || null;
    const moduleName = entityType === "PAYMENT" ? "PAYMENTS" : "INVOICES";

    const log = await prisma.auditLog.create({
      data: {
        action: "WHATSAPP_SHARE_INITIATED",
        module: moduleName,
        entityId: String(entityId),
        userId,
        newData: JSON.stringify({
          entityType,
          entityId,
          documentNo,
          recipientPhone,
          recipientName,
          sharedAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({ success: true, logId: log.id });
  } catch (error: any) {
    console.error("[audit/whatsapp-share] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to record audit log" },
      { status: 500 }
    );
  }
}

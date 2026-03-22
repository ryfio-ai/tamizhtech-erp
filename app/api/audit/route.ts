import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "activity"; // "activity" or "audit"
    const limit = parseInt(searchParams.get("limit") || "50");

    if (type === "audit") {
      const logs = await prisma.auditLog.findMany({
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              image: true
            }
          }
        }
      });
      return NextResponse.json({ success: true, data: logs });
    }

    const logs = await prisma.activityLog.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            image: true
          }
        }
      }
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (error: any) {
    console.error("Audit API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

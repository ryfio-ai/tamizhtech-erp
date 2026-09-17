import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    const allowedRoles = ["SUPER_ADMIN", "ADMIN", "MANAGER"];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

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

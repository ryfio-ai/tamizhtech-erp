import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const typeParam = searchParams.get("type");
    const statusParam = searchParams.get("status");
    const emailStatusParam = searchParams.get("emailStatus") || searchParams.get("sheetSyncStatus");
    const query = searchParams.get("search") || searchParams.get("q") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (typeParam && typeParam !== "ALL") {
      where.type = typeParam;
    }

    if (statusParam && statusParam !== "ALL") {
      where.status = statusParam;
    }

    if (emailStatusParam && emailStatusParam !== "ALL") {
      where.OR = [
        { customerEmailStatus: emailStatusParam },
        { adminEmailStatus: emailStatusParam },
      ];
    }

    if (query.trim()) {
      const q = query.trim();
      const regex = { contains: q, mode: "insensitive" as const };
      where.OR = [
        { submissionNo: regex },
        { name: regex },
        { email: regex },
        { mobile: regex },
        { company: regex },
      ];
    }

    const [submissions, total, countsByType, failedEmailsCount] = await Promise.all([
      prisma.inboundSubmission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          client: { select: { id: true, clientCode: true, name: true } },
          events: true,
        },
      }),
      prisma.inboundSubmission.count({ where }),
      prisma.inboundSubmission.groupBy({
        by: ["type"],
        _count: { _all: true },
      }),
      prisma.inboundSubmission.count({
        where: {
          OR: [
            { customerEmailStatus: "FAILED" },
            { adminEmailStatus: "FAILED" },
          ],
        },
      }),
    ]);

    const summaryCounts: Record<string, number> = {
      TOTAL: 0,
      RFQ: 0,
      CONTACT: 0,
      CAREER: 0,
      CLUB_REGISTRATION: 0,
      FAILED_EMAILS: failedEmailsCount,
    };

    countsByType.forEach((c) => {
      summaryCounts[c.type] = c._count._all;
      summaryCounts.TOTAL += c._count._all;
    });

    return NextResponse.json({
      success: true,
      data: submissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summaryCounts,
    });
  } catch (error: any) {
    console.error("[SUBMISSIONS_GET_ERROR]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

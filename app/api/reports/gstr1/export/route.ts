import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  getGstr1SalesData,
  generateGstr1Csv,
  generateGstr1Xlsx,
} from "@/lib/gstr1Service";

export const revalidate = 0;

/**
 * GET /api/reports/gstr1/export
 * Downloads authoritative GSTR-1 Sales Report as CSV or XLSX.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = req.nextUrl.searchParams;
    const format = (searchParams.get("format") || "csv").toLowerCase();
    const fromDate = searchParams.get("fromDate") || undefined;
    const toDate = searchParams.get("toDate") || undefined;
    const financialYear = searchParams.get("financialYear") || undefined;

    const { rows, summary } = await getGstr1SalesData({
      fromDate,
      toDate,
      financialYear,
    });

    // Generate clean filename
    const dateTag = financialYear
      ? `FY_${financialYear}`
      : `${fromDate || "ALL"}_to_${toDate || "ALL"}`;
    const filename = `GSTR1_Sales_Report_${dateTag}.${format === "xlsx" ? "xlsx" : "csv"}`;

    // Record Audit Log
    const userId = (session.user as any)?.id;
    if (userId) {
      await prisma.auditLog.create({
        data: {
          action: "GSTR1_EXPORT_GENERATED",
          module: "FINANCE",
          userId,
          newData: JSON.stringify({
            format,
            dateRange: dateTag,
            invoicesCount: summary.invoicesCount,
            totalValue: summary.totalInvoiceValueRupees,
          }),
        },
      });
    }

    if (format === "xlsx") {
      const buffer = generateGstr1Xlsx(rows);
      return new NextResponse(buffer as any, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    // Default: CSV
    const csvContent = generateGstr1Csv(rows);
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("GSTR-1 Export Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

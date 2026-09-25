import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGstr1SalesData } from "@/lib/gstr1Service";

export const revalidate = 0;

/**
 * GET /api/reports/gstr1
 * Returns real-time GSTR-1 sales tax summary metrics and preview rows.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = req.nextUrl.searchParams;
    const fromDate = searchParams.get("fromDate") || undefined;
    const toDate = searchParams.get("toDate") || undefined;
    const financialYear = searchParams.get("financialYear") || undefined;
    const clientId = searchParams.get("clientId") || undefined;

    const data = await getGstr1SalesData({
      fromDate,
      toDate,
      financialYear,
      clientId,
    });

    return NextResponse.json({
      success: true,
      summary: data.summary,
      rows: data.rows,
    });
  } catch (error: any) {
    console.error("GET GSTR-1 Report Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

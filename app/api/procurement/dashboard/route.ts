import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProcurementDashboardMetrics } from "@/lib/procurementService";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const metrics = await getProcurementDashboardMetrics();
    return NextResponse.json({ success: true, data: metrics });
  } catch (error: any) {
    console.error("GET /api/procurement/dashboard error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load procurement dashboard" },
      { status: 500 }
    );
  }
}

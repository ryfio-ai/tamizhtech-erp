import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getPurchaseOrderById,
} from "@/lib/procurementService";

export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const po = await getPurchaseOrderById(params.id);
    if (!po) {
      return NextResponse.json({ success: false, error: "Purchase Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: po });
  } catch (error: any) {
    console.error("GET /api/purchase-orders/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to get purchase order" },
      { status: 500 }
    );
  }
}

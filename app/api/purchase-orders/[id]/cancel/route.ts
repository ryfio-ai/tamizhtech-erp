import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cancelPurchaseOrder } from "@/lib/procurementService";

export const revalidate = 0;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const userId = (session.user as any).id || "system";
    const reason = body.reason || "Cancelled by user";

    const cancelled = await cancelPurchaseOrder(params.id, userId, reason);

    return NextResponse.json({ success: true, data: cancelled });
  } catch (error: any) {
    console.error("POST /api/purchase-orders/[id]/cancel error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to cancel purchase order" },
      { status: 400 }
    );
  }
}

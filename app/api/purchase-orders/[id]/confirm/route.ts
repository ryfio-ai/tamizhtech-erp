import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { confirmPurchaseOrder } from "@/lib/procurementService";

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

    const userId = (session.user as any).id || "system";
    const confirmed = await confirmPurchaseOrder(params.id, userId);

    return NextResponse.json({ success: true, data: confirmed });
  } catch (error: any) {
    console.error("POST /api/purchase-orders/[id]/confirm error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to confirm purchase order" },
      { status: 400 }
    );
  }
}

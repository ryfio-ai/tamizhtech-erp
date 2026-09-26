import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { confirmSalesOrder } from "@/lib/salesOrderService";

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

    const confirmed = await confirmSalesOrder(params.id, (session.user as any).id);
    return NextResponse.json({ success: true, data: confirmed });
  } catch (error: any) {
    console.error("POST /api/sales-orders/[id]/confirm Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to confirm sales order" },
      { status: 400 }
    );
  }
}

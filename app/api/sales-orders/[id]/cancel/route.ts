import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cancelSalesOrder } from "@/lib/salesOrderService";

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

    const body = await req.json();
    if (!body.reason || !body.reason.trim()) {
      return NextResponse.json(
        { success: false, error: "A cancellation reason is required." },
        { status: 400 }
      );
    }

    const cancelled = await cancelSalesOrder(
      params.id,
      body.reason.trim(),
      (session.user as any).id
    );

    return NextResponse.json({ success: true, data: cancelled });
  } catch (error: any) {
    console.error("POST /api/sales-orders/[id]/cancel Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to cancel sales order" },
      { status: 400 }
    );
  }
}

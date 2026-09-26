import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { reserveStockForOrder } from "@/lib/salesOrderService";

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

    const reserved = await reserveStockForOrder(params.id, (session.user as any).id);
    return NextResponse.json({ success: true, data: reserved });
  } catch (error: any) {
    console.error("POST /api/sales-orders/[id]/reserve Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to reserve stock" },
      { status: 400 }
    );
  }
}

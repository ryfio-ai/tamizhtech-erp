import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fulfillOrder } from "@/lib/salesOrderService";

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
    const fulfilled = await fulfillOrder(
      params.id,
      body.items,
      (session.user as any).id
    );

    return NextResponse.json({ success: true, data: fulfilled });
  } catch (error: any) {
    console.error("POST /api/sales-orders/[id]/fulfill Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fulfill sales order" },
      { status: 400 }
    );
  }
}

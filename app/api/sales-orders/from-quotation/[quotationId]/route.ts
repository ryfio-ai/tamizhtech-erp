import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createSalesOrderFromQuotation } from "@/lib/salesOrderService";

export const revalidate = 0;

export async function POST(
  req: NextRequest,
  { params }: { params: { quotationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const order = await createSalesOrderFromQuotation(params.quotationId, {
      ...body,
      userId: (session.user as any).id,
    });

    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/sales-orders/from-quotation Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to convert quotation to sales order" },
      { status: 400 }
    );
  }
}

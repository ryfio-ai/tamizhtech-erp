import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createSalesOrder,
  listSalesOrders,
  OrderStatus,
  OrderType,
} from "@/lib/salesOrderService";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId") || undefined;
    const quotationId = searchParams.get("quotationId") || undefined;
    const status = (searchParams.get("status") as OrderStatus) || undefined;
    const orderType = (searchParams.get("orderType") as OrderType) || undefined;
    const search = searchParams.get("search") || undefined;

    const orders = await listSalesOrders({
      clientId,
      quotationId,
      status,
      orderType,
      search,
    });

    return NextResponse.json({ success: true, data: orders });
  } catch (error: any) {
    console.error("GET /api/sales-orders Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch sales orders" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const created = await createSalesOrder({
      ...body,
      userId: (session.user as any).id,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/sales-orders Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create sales order" },
      { status: 400 }
    );
  }
}

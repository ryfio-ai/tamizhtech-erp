import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getSalesOrderById,
  getOrderTraceabilityTimeline,
} from "@/lib/salesOrderService";
import prisma from "@/lib/prisma";

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

    const order = await getSalesOrderById(params.id);
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Sales Order not found" },
        { status: 404 }
      );
    }

    const timeline = await getOrderTraceabilityTimeline(params.id);

    return NextResponse.json({ success: true, data: { ...order, timeline } });
  } catch (error: any) {
    console.error("GET /api/sales-orders/[id] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch sales order" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const updated = await prisma.salesOrder.update({
      where: { id: params.id },
      data: {
        notes: body.notes !== undefined ? body.notes : undefined,
      },
    });

    const fullOrder = await getSalesOrderById(params.id);
    return NextResponse.json({ success: true, data: fullOrder });
  } catch (error: any) {
    console.error("PATCH /api/sales-orders/[id] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update sales order" },
      { status: 400 }
    );
  }
}

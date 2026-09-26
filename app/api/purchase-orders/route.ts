import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createPurchaseOrder,
  listPurchaseOrders,
} from "@/lib/procurementService";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const vendorId = searchParams.get("vendorId") || searchParams.get("supplierId") || undefined;
    const projectId = searchParams.get("projectId") || undefined;
    const salesOrderId = searchParams.get("salesOrderId") || undefined;
    const search = searchParams.get("search") || undefined;

    const orders = await listPurchaseOrders({
      status,
      supplierId: vendorId,
      projectId,
      salesOrderId,
      search,
    });

    return NextResponse.json({ success: true, data: orders });
  } catch (error: any) {
    console.error("GET /api/purchase-orders error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list purchase orders" },
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
    const userId = (session.user as any).id || "system";

    const po = await createPurchaseOrder({
      ...body,
      userId,
    });

    return NextResponse.json({ success: true, data: po }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/purchase-orders error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create purchase order" },
      { status: 400 }
    );
  }
}

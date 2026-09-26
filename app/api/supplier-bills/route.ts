import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createSupplierBill } from "@/lib/procurementService";
import { getMongoDb } from "@/lib/mongodb";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get("supplierId");
    const purchaseOrderId = searchParams.get("purchaseOrderId");
    const status = searchParams.get("status");

    const db = await getMongoDb();
    const query: any = {};
    if (supplierId) query.supplierId = supplierId;
    if (purchaseOrderId) query.purchaseOrderId = purchaseOrderId;
    if (status) query.status = status;

    const bills = await db
      .collection("SupplierBill")
      .find(query)
      .sort({ billDate: -1 })
      .toArray();

    const formatted = bills.map((b) => ({
      ...b,
      id: b._id.toString(),
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error("GET /api/supplier-bills error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list supplier bills" },
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

    const bill = await createSupplierBill({
      ...body,
      userId,
    });

    return NextResponse.json({ success: true, data: bill }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/supplier-bills error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create supplier bill" },
      { status: 400 }
    );
  }
}

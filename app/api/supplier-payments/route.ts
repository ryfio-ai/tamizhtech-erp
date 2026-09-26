import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recordSupplierPayment } from "@/lib/procurementService";
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
    const supplierBillId = searchParams.get("supplierBillId");

    const db = await getMongoDb();
    const query: any = {};
    if (supplierId) query.supplierId = supplierId;
    if (supplierBillId) query.supplierBillId = supplierBillId;

    const payments = await db
      .collection("SupplierPayment")
      .find(query)
      .sort({ paymentDate: -1 })
      .toArray();

    const formatted = payments.map((p) => ({
      ...p,
      id: p._id.toString(),
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error("GET /api/supplier-payments error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list supplier payments" },
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

    const payment = await recordSupplierPayment({
      ...body,
      userId,
    });

    return NextResponse.json({ success: true, data: payment }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/supplier-payments error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to record supplier payment" },
      { status: 400 }
    );
  }
}

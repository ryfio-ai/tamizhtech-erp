import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createAndConfirmGoodsReceipt,
} from "@/lib/procurementService";
import { getMongoDb } from "@/lib/mongodb";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const purchaseOrderId = searchParams.get("purchaseOrderId");
    const supplierId = searchParams.get("supplierId");

    const db = await getMongoDb();
    const query: any = {};
    if (purchaseOrderId) query.purchaseOrderId = purchaseOrderId;
    if (supplierId) query.supplierId = supplierId;

    const grns = await db
      .collection("GoodsReceipt")
      .find(query)
      .sort({ receivedAt: -1 })
      .toArray();

    const formatted = grns.map((g) => ({
      ...g,
      id: g._id.toString(),
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error("GET /api/goods-receipts error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list goods receipts" },
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

    const grn = await createAndConfirmGoodsReceipt({
      ...body,
      userId,
    });

    return NextResponse.json({ success: true, data: grn }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/goods-receipts error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to record goods receipt" },
      { status: 400 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getProductStockHistory } from "@/lib/stockService";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const history = await getProductStockHistory(params.id);
    return NextResponse.json({ success: true, data: history });
  } catch (error: any) {
    console.error("GET Stock History Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { voidInventorySourcing } from "@/lib/stockService";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { reason, userId } = body;

    if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: "Void reason (min 3 chars) is required." },
        { status: 400 }
      );
    }

    const voidedSourcing = await voidInventorySourcing(params.id, reason.trim(), userId);

    return NextResponse.json({
      success: true,
      data: voidedSourcing,
      message: `Sourcing ${voidedSourcing.sourcingNo} voided successfully with stock and payment reversals.`,
    });
  } catch (error: any) {
    console.error("Void Sourcing Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to void sourcing record" },
      { status: 400 }
    );
  }
}

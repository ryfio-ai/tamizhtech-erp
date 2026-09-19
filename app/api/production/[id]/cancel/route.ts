import { NextRequest, NextResponse } from "next/server";
import { cancelProductionBatch } from "@/lib/productionService";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { cancelReason, userId } = body;

    if (!cancelReason || typeof cancelReason !== "string" || cancelReason.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: "Cancellation reason (min 3 chars) is required." },
        { status: 400 }
      );
    }

    const cancelledRecord = await cancelProductionBatch({
      productionId: params.id,
      cancelReason: cancelReason.trim(),
      userId,
    });

    return NextResponse.json({
      success: true,
      data: cancelledRecord,
      message: `Production ${cancelledRecord.productionNo} cancelled successfully with stock reversals.`,
    });
  } catch (error: any) {
    console.error("Cancel Production Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to cancel production" },
      { status: 400 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createPurchaseReturn } from "@/lib/procurementService";

export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const userId = (session.user as any).id || "system";

    const result = await createPurchaseReturn({
      ...body,
      userId,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/purchase-returns error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process purchase return" },
      { status: 400 }
    );
  }
}

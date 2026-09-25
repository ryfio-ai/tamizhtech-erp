import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { calculateBOMRequirements } from "@/lib/bomService";

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

    const { searchParams } = new URL(req.url);
    const quantity = Number(searchParams.get("quantity")) || 1;

    const requirements = await calculateBOMRequirements(params.id, quantity);
    return NextResponse.json({ success: true, data: requirements });
  } catch (error: any) {
    console.error("GET /api/bom/[id]/requirements Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to calculate requirements" },
      { status: 400 }
    );
  }
}

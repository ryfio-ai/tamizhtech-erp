import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { executeBOMAssembly } from "@/lib/bomService";
import { fromPaise } from "@/lib/money";

export const revalidate = 0;

const ALLOWED_ASSEMBLY_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "OPERATIONS", "ENGINEERING"];

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!ALLOWED_ASSEMBLY_ROLES.includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You lack permission to execute production assembly." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { buildQuantity, directCost = 0, notes, idempotencyKey } = body;

    const production = await executeBOMAssembly({
      bomId: params.id,
      buildQuantity: Number(buildQuantity),
      directCost: Number(directCost) || 0,
      notes,
      idempotencyKey,
      userId: (session.user as any).id,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...production,
        materialCostRupees: production ? fromPaise((production as any).materialCostPaise || (production as any).materialCost) : 0,
        directCostRupees: production ? fromPaise((production as any).directCostPaise || (production as any).directCost) : 0,
        totalProductionCostRupees: production ? fromPaise((production as any).totalProductionCostPaise || (production as any).totalProductionCost) : 0,
        unitProductionCostRupees: production ? fromPaise((production as any).unitProductionCostPaise || (production as any).unitProductionCost) : 0,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/bom/[id]/assemble Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute BOM assembly" },
      { status: 400 }
    );
  }
}

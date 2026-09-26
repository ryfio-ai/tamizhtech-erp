import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getSupplierById,
  updateSupplier,
} from "@/lib/procurementService";

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

    const supplier = await getSupplierById(params.id);
    if (!supplier) {
      return NextResponse.json({ success: false, error: "Supplier not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: supplier });
  } catch (error: any) {
    console.error("GET /api/suppliers/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to get supplier" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const userId = (session.user as any).id || "system";

    const updated = await updateSupplier(params.id, {
      ...body,
      userId,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("PATCH /api/suppliers/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update supplier" },
      { status: 400 }
    );
  }
}

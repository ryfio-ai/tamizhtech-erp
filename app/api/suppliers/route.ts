import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createSupplier,
  listSuppliers,
  checkDuplicateSupplier,
} from "@/lib/procurementService";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    const result = await listSuppliers({ status, search });
    return NextResponse.json({
      success: true,
      data: result.suppliers,
      suppliers: result.suppliers,
      total: result.total,
    });
  } catch (error: any) {
    console.error("GET /api/suppliers error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list suppliers" },
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

    // Optional duplicate check query
    if (body.checkDuplicatesOnly) {
      const duplicateInfo = await checkDuplicateSupplier({
        name: body.legalName || body.name,
        gstin: body.GSTIN || body.gstin,
        phone: body.phone,
        email: body.email,
      });
      return NextResponse.json({ success: true, data: duplicateInfo });
    }

    const supplier = await createSupplier({
      ...body,
      userId,
    });

    return NextResponse.json({ success: true, data: supplier }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/suppliers error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create supplier" },
      { status: 400 }
    );
  }
}

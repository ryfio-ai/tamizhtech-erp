import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBOMById, activateBOM, archiveBOM } from "@/lib/bomService";

export const revalidate = 0;

const ALLOWED_BOM_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "OPERATIONS", "ENGINEERING"];

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const bom = await getBOMById(params.id);
    if (!bom) {
      return NextResponse.json({ success: false, error: "BOM not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: bom });
  } catch (error: any) {
    console.error("GET /api/bom/[id] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch BOM" },
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

    const userRole = (session.user as any).role;
    if (!ALLOWED_BOM_ROLES.includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You lack permission to modify Bill of Materials status." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action } = body;
    const userId = (session.user as any).id;

    if (action === "ACTIVATE") {
      const updated = await activateBOM(params.id, userId);
      return NextResponse.json({ success: true, data: updated });
    } else if (action === "ARCHIVE") {
      const updated = await archiveBOM(params.id, userId);
      return NextResponse.json({ success: true, data: updated });
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid action. Supported actions: ACTIVATE, ARCHIVE." },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("PATCH /api/bom/[id] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update BOM status" },
      { status: 400 }
    );
  }
}

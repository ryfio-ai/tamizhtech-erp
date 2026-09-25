import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createBOM, listBOMs, BOMStatus } from "@/lib/bomService";

export const revalidate = 0;

const ALLOWED_BOM_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "OPERATIONS", "ENGINEERING"];

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const parentProductId = searchParams.get("parentProductId") || undefined;
    const status = (searchParams.get("status") as BOMStatus) || undefined;

    const boms = await listBOMs({ parentProductId, status });
    return NextResponse.json({ success: true, data: boms });
  } catch (error: any) {
    console.error("GET /api/bom Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch BOMs" },
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

    const userRole = (session.user as any).role;
    if (!ALLOWED_BOM_ROLES.includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You lack permission to create a Bill of Materials." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { parentProductId, items, notes, status } = body;

    const created = await createBOM({
      parentProductId,
      items,
      notes,
      status,
      userId: (session.user as any).id,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/bom Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create Bill of Materials" },
      { status: 400 }
    );
  }
}

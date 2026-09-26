import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  approveProcurementRequest,
} from "@/lib/procurementService";

export const revalidate = 0;

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

    if (body.action === "APPROVE") {
      const approved = await approveProcurementRequest(params.id, userId);
      return NextResponse.json({ success: true, data: approved });
    }

    return NextResponse.json({ success: false, error: "Unsupported action" }, { status: 400 });
  } catch (error: any) {
    console.error("PATCH /api/procurement-requests/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update procurement request" },
      { status: 400 }
    );
  }
}

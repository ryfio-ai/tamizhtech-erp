import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDeliveryChallanById,
  issueDeliveryChallan,
  cancelDeliveryChallan,
} from "@/lib/challanService";

export const revalidate = 0;

const ALLOWED_CHALLAN_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "OPERATIONS",
  "SALES",
  "ENGINEERING",
];

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const challan = await getDeliveryChallanById(params.id);
    if (!challan) {
      return NextResponse.json({ success: false, error: "Delivery Challan not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: challan });
  } catch (error: any) {
    console.error("GET /api/challans/[id] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch Delivery Challan" },
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
    if (!ALLOWED_CHALLAN_ROLES.includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You lack permission to modify Delivery Challans." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action, cancelReason } = body;
    const userId = (session.user as any).id;

    if (action === "ISSUE") {
      const updated = await issueDeliveryChallan(params.id, userId);
      return NextResponse.json({ success: true, data: updated });
    } else if (action === "CANCEL") {
      const updated = await cancelDeliveryChallan(params.id, cancelReason, userId);
      return NextResponse.json({ success: true, data: updated });
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid action. Supported actions: ISSUE, CANCEL." },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("PATCH /api/challans/[id] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update Delivery Challan" },
      { status: 400 }
    );
  }
}

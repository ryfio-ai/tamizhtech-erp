import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createDeliveryChallan,
  listDeliveryChallans,
  ChallanStatus,
  ChallanPurpose,
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

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId") || undefined;
    const status = (searchParams.get("status") as ChallanStatus) || undefined;
    const purpose = (searchParams.get("purpose") as ChallanPurpose) || undefined;

    const challans = await listDeliveryChallans({ clientId, status, purpose });
    return NextResponse.json({ success: true, data: challans });
  } catch (error: any) {
    console.error("GET /api/challans Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch Delivery Challans" },
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
    if (!ALLOWED_CHALLAN_ROLES.includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You lack permission to create Delivery Challans." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const created = await createDeliveryChallan({
      ...body,
      userId: (session.user as any).id,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/challans Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create Delivery Challan" },
      { status: 400 }
    );
  }
}

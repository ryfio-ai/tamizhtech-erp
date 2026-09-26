import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createProjectFromOrder } from "@/lib/salesOrderService";

export const revalidate = 0;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const project = await createProjectFromOrder(
      params.id,
      body,
      (session.user as any).id
    );

    return NextResponse.json({ success: true, data: project }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/sales-orders/[id]/create-project Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create project from order" },
      { status: 400 }
    );
  }
}

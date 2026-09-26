import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listEligibleStudents } from "@/lib/certificateService";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const eligible = await listEligibleStudents();
    return NextResponse.json({ success: true, data: eligible });
  } catch (error: any) {
    console.error("GET /api/certificates/eligible Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch eligible students" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createProjectTask } from "@/lib/projectService";

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

    const body = await req.json();
    const task = await createProjectTask(
      {
        ...body,
        projectId: params.id,
      },
      (session.user as any).id
    );

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/projects/[id]/tasks Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create task" },
      { status: 400 }
    );
  }
}

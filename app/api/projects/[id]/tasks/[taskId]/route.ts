import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateProjectTask } from "@/lib/projectService";

export const revalidate = 0;

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; taskId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const task = await updateProjectTask(
      params.taskId,
      body,
      (session.user as any).id
    );

    return NextResponse.json({ success: true, data: task });
  } catch (error: any) {
    console.error("PATCH /api/projects/[id]/tasks/[taskId] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update task" },
      { status: 400 }
    );
  }
}

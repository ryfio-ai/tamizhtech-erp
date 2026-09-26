import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getProjectById,
  updateProject,
} from "@/lib/projectService";

export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const project = await getProjectById(params.id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: project });
  } catch (error: any) {
    console.error("GET /api/projects/[id] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch project" },
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

    const body = await req.json();
    const updated = await updateProject(
      params.id,
      body,
      (session.user as any).id
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("PATCH /api/projects/[id] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update project" },
      { status: 400 }
    );
  }
}

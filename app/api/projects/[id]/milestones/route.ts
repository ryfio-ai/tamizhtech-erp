import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createProjectMilestone,
  completeProjectMilestone,
} from "@/lib/projectService";
import { getMongoDb } from "@/lib/mongodb";

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

    const db = await getMongoDb();
    const milestones = await db
      .collection("ProjectMilestone")
      .find({ projectId: params.id })
      .sort({ orderIndex: 1, createdAt: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: milestones.map((m) => ({
        id: m._id.toString(),
        projectId: m.projectId,
        title: m.title,
        description: m.description,
        targetDate: m.targetDate,
        completedAt: m.completedAt,
        isCompleted: m.isCompleted,
        orderIndex: m.orderIndex,
      })),
    });
  } catch (error: any) {
    console.error("GET /api/projects/[id]/milestones Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch milestones" },
      { status: 500 }
    );
  }
}

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
    if (body.action === "COMPLETE" && body.milestoneId) {
      await completeProjectMilestone(body.milestoneId, (session.user as any).id);
      return NextResponse.json({ success: true, message: "Milestone marked as completed." });
    }

    const milestone = await createProjectMilestone(
      params.id,
      body,
      (session.user as any).id
    );

    return NextResponse.json({ success: true, data: milestone }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/projects/[id]/milestones Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save milestone" },
      { status: 400 }
    );
  }
}

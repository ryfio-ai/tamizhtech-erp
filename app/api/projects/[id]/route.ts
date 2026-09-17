import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/projects/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        tasks: true,
      },
    });

    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: project });
  } catch (error: any) {
    console.error("Fetch project error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH /api/projects/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { name, status, clientId, startDate, endDate } = body;

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name.trim();
    if (status !== undefined) dataToUpdate.status = status;
    if (clientId !== undefined) dataToUpdate.clientId = clientId || null;
    if (startDate !== undefined) dataToUpdate.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) dataToUpdate.endDate = endDate ? new Date(endDate) : null;

    const updated = await prisma.project.update({
      where: { id: params.id },
      data: dataToUpdate,
      include: { client: true, tasks: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Update project error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/projects/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const project = await prisma.project.findUnique({ where: { id: params.id } });
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.task.deleteMany({ where: { projectId: params.id } }),
      prisma.project.delete({ where: { id: params.id } }),
    ]);

    return NextResponse.json({ success: true, data: null, message: "Project deleted successfully" });
  } catch (error: any) {
    console.error("Delete project error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

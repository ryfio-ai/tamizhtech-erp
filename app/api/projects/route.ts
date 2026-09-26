import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createProject,
  listProjects,
  ProjectStatus,
} from "@/lib/projectService";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId") || undefined;
    const orderId = searchParams.get("orderId") || undefined;
    const status = (searchParams.get("status") as ProjectStatus) || undefined;
    const search = searchParams.get("search") || undefined;

    const projects = await listProjects({
      clientId,
      orderId,
      status,
      search,
    });

    return NextResponse.json({ success: true, data: projects });
  } catch (error: any) {
    console.error("GET /api/projects Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch projects" },
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

    const body = await req.json();
    const project = await createProject(
      body,
      (session.user as any).id
    );

    return NextResponse.json({ success: true, data: project }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/projects Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create project" },
      { status: 400 }
    );
  }
}

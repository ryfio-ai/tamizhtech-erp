import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { projectSchema } from "@/lib/validations";
import { z } from "zod";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const projects = await prisma.project.findMany({
      include: {
        client: true,
        tasks: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: projects });
  } catch (error: any) {
    console.error("GET Projects Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = projectSchema.parse(body);

    const newProject = await prisma.project.create({
      data: {
        name: validated.name,
        clientId: validated.clientId,
        status: validated.status || "PLANNING",
        startDate: validated.startDate,
        endDate: validated.endDate,
        budget: validated.budget
      }
    });

    return NextResponse.json({ success: true, data: newProject }, { status: 201 });
  } catch (error: any) {
    console.error("POST Project Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

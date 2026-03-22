import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { leadSchema } from "@/lib/validations";
import { z } from "zod";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const leads = await prisma.lead.findMany({
      include: {
        assignedTo: true,
        followUps: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: leads });
  } catch (error: any) {
    console.error("GET Leads Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = leadSchema.parse(body);

    const newLead = await prisma.lead.create({
      data: {
        name: validated.name,
        email: validated.email,
        phone: validated.phone,
        status: validated.status || "NEW",
        source: validated.source || "ONLINE",
        notes: validated.notes || "",
        assignedToId: validated.assignedToId
      }
    });

    return NextResponse.json({ success: true, data: newLead }, { status: 201 });
  } catch (error: any) {
    console.error("POST Lead Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

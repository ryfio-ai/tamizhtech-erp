import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { CreateApplicationInput } from "@/types";
import { generateId } from "@/lib/utils";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const applications = await prisma.application.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const formatted = applications.map(a => ({
      ...a,
      createdAt: a.createdAt.toISOString()
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateApplicationInput = await req.json();
    const newId = generateId();

    const count = await prisma.application.count();
    const appNo = `APP-${String(count + 1).padStart(6, '0')}`;

    let clientId = body.clientId;
    if (!clientId) {
      const client = await prisma.client.create({
        data: {
          clientCode: `CL-${Date.now().toString().slice(-4)}`,
          name: body.name || "Student Applicant",
          email: body.email || `applicant-${Date.now()}@tamizhtech.in`,
          phone: body.phone || "0000000000",
          city: body.city || "Coimbatore",
          status: "STUDENT",
        }
      });
      clientId = client.id;
    }

    const newApp = await prisma.application.create({
      data: {
        appNo,
        clientId,
        course: body.course || body.appliedFor || "Robotics Training",
        status: (body.status || "NEW").toUpperCase(),
      }
    });

    return NextResponse.json({ success: true, data: newApp }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

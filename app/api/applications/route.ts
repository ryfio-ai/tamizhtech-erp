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
    const applicationNo = `APP-${String(count + 1).padStart(6, '0')}`;

    const newApp = await prisma.application.create({
      data: {
        id: newId,
        applicationNo,
        name: body.name,
        email: body.email,
        phone: body.phone,
        city: body.city,
        appliedFor: body.appliedFor,
        appliedDate: body.appliedDate || new Date().toISOString().split('T')[0],
        status: body.status || "New",
        source: body.source || "Website",
        notes: body.notes || "",
        emailSent: false
      }
    });

    return NextResponse.json({ success: true, data: newApp }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

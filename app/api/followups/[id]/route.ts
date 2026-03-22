import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const followup = await prisma.followUp.findUnique({
      where: { id: params.id },
      include: { client: true }
    });

    if (!followup) throw new Error("Not found");

    return NextResponse.json({ 
      success: true, 
      data: { ...followup, clientName: followup.client.name, clientPhone: followup.client.phone }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    
    const updated = await prisma.followUp.update({
      where: { id: params.id },
      data: body
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.followUp.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, data: null });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

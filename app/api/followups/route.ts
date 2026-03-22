import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { CreateFollowUpInput } from "@/types";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const followups = await prisma.followUp.findMany({
      include: { client: true },
      orderBy: [{ date: 'asc' }, { time: 'asc' }]
    });

    // Dynamic Overdue resolution logic
    const today = new Date();
    today.setHours(0,0,0,0);

    const formatted = followups.map(f => {
      let currentStatus = f.status;
      const fDate = new Date(f.date);
      fDate.setHours(0,0,0,0);

      if (currentStatus === "Pending" && fDate < today) {
        currentStatus = "Overdue";
      }

      return {
        ...f,
        clientName: f.client.name,
        clientPhone: f.client.phone,
        status: currentStatus,
        createdAt: f.createdAt.toISOString()
      };
    });

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateFollowUpInput = await req.json();
    
    const client = await prisma.client.findUnique({ where: { id: body.clientId } });
    if (!client) throw new Error("Client not found");

    const newFollowUp = await prisma.followUp.create({
      data: {
        clientId: body.clientId,
        date: body.date,
        time: body.time,
        mode: body.mode,
        summary: body.summary,
        nextAction: body.nextAction || "",
        status: body.status || "Pending",
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: { ...newFollowUp, clientName: client.name, clientPhone: client.phone } 
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { UpdateClientInput } from "@/types";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: {
        invoices: true,
        payments: true,
        followUps: true,
        applications: true,
        projects: true
      }
    });

    if (!client) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 });
    }

    const formattedClient = {
      ...client,
      totalInvoiced: client.invoices.reduce((sum, inv) => sum + inv.total, 0),
      totalPaid: client.payments.reduce((sum, pay) => sum + pay.amount, 0),
      outstandingBalance: client.invoices.reduce((sum, inv) => sum + inv.balance, 0),
      createdAt: client.createdAt.toISOString()
    };

    return NextResponse.json({ success: true, data: formattedClient });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body: Partial<UpdateClientInput> & { type?: string, status?: string, assignedToId?: string, company?: string, notes?: string } = await req.json();
    
    // Check duplicates if updating email or phone
    if (body.email || body.phone) {
      const duplicate = await prisma.client.findFirst({
        where: {
          id: { not: params.id },
          OR: [
            body.email ? { email: body.email } : undefined,
            body.phone ? { phone: body.phone } : undefined
          ].filter(Boolean) as any
        }
      });
      if (duplicate) {
        return NextResponse.json({ success: false, error: "Email or phone already in use" }, { status: 400 });
      }
    }

    const updated = await prisma.client.update({
      where: { id: params.id },
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        city: body.city,
        company: body.company,
        notes: body.notes,
        serviceType: body.serviceType,
        source: body.source,
        type: body.type,
        status: body.status,
        assignedToId: body.assignedToId
      } as any
    });

    return NextResponse.json({ success: true, data: { ...updated, createdAt: updated.createdAt.toISOString() } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: {
        invoices: { select: { id: true } },
        payments: { select: { id: true } },
      }
    });

    if (!client) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 });
    }

    // Protect financial accounting: If client has invoices or payments, never delete financial history
    if (client.invoices.length > 0 || client.payments.length > 0) {
      const deactivated = await prisma.client.update({
        where: { id: params.id },
        data: { status: "INACTIVE" }
      });
      return NextResponse.json({
        success: true,
        data: deactivated,
        message: "Customer deactivated. Financial and invoice ledger history has been safely preserved."
      });
    }

    // Only clients with zero financial history can be permanently deleted
    await prisma.$transaction([
      prisma.task.deleteMany({ where: { project: { clientId: params.id } } }),
      prisma.project.deleteMany({ where: { clientId: params.id } }),
      prisma.followUp.deleteMany({ where: { clientId: params.id } }),
      prisma.application.deleteMany({ where: { clientId: params.id } }),
      prisma.clientContact.deleteMany({ where: { clientId: params.id } }),
      prisma.client.delete({ where: { id: params.id } })
    ]);

    return NextResponse.json({ success: true, data: null, message: "Customer deleted successfully" });
  } catch (error: any) {
    console.error("DELETE Client Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

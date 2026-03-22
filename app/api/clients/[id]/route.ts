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
    const body: Partial<UpdateClientInput> & { type?: string, status?: string, assignedToId?: string } = await req.json();
    
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
        serviceType: body.serviceType,
        source: body.source,
        type: body.type,
        status: body.status,
        assignedToId: body.assignedToId
      }
    });

    return NextResponse.json({ success: true, data: { ...updated, createdAt: updated.createdAt.toISOString() } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check for active invoices with balance
    const invoices = await prisma.invoice.findMany({ where: { clientId: params.id } });
    const hasBalance = invoices.some(inv => inv.balance > 0);
    
    if (hasBalance) {
      return NextResponse.json({ success: false, error: "Cannot delete client with outstanding invoice balance." }, { status: 400 });
    }

    // Manual cleanup for SQLite (handles cascaded deletions for relations)
    await prisma.$transaction([
      // 1. Delete tasks belonging to client's projects
      prisma.task.deleteMany({ where: { project: { clientId: params.id } } }),
      // 2. Delete projects
      prisma.project.deleteMany({ where: { clientId: params.id } }),
      // 3. Delete invoice items
      prisma.invoiceItem.deleteMany({ where: { invoice: { clientId: params.id } } }),
      // 4. Delete payments
      prisma.payment.deleteMany({ where: { clientId: params.id } }),
      // 5. Delete invoices
      prisma.invoice.deleteMany({ where: { clientId: params.id } }),
      // 6. Delete follow-ups
      prisma.followUp.deleteMany({ where: { clientId: params.id } }),
      // 7. Delete applications
      prisma.application.deleteMany({ where: { clientId: params.id } }),
      // 8. Delete client contacts
      prisma.clientContact.deleteMany({ where: { clientId: params.id } }),
      // 9. Finally delete the client
      prisma.client.delete({ where: { id: params.id } })
    ]);

    return NextResponse.json({ success: true, data: null });
  } catch (error: any) {
    console.error("DELETE Client Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

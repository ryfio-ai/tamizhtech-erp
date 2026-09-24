import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { UpdateClientInput } from "@/types";
import { normalizeMobile, isValidMobile } from "@/lib/phone";
import { fromPaise } from "@/lib/money";

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
      totalInvoiced: fromPaise(client.invoices.reduce((sum, inv) => sum + inv.total, 0)),
      totalPaid: fromPaise(client.payments.reduce((sum, pay) => sum + pay.amount, 0)),
      outstandingBalance: fromPaise(client.invoices.reduce((sum, inv) => sum + inv.balance, 0)),
      createdAt: client.createdAt.toISOString()
    };

    return NextResponse.json({ success: true, data: formattedClient });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body: any = await req.json();

    let mobileNormalized: string | undefined;
    if (body.phone) {
      if (!isValidMobile(body.phone)) {
        return NextResponse.json(
          { success: false, error: "Please enter a valid mobile / WhatsApp number." },
          { status: 400 }
        );
      }
      mobileNormalized = normalizeMobile(body.phone);

      // Check if another customer owns this normalized mobile
      const conflict = await prisma.client.findFirst({
        where: {
          id: { not: params.id },
          mobileNormalized,
        },
      });

      if (conflict) {
        return NextResponse.json(
          {
            success: false,
            error: "This mobile number is already linked to another customer.",
            code: "DUPLICATE_MOBILE",
            existingClient: {
              id: conflict.id,
              clientCode: conflict.clientCode,
              name: conflict.name,
              phone: conflict.phone,
            },
          },
          { status: 409 }
        );
      }
    }

    try {
      const updated = await prisma.client.update({
        where: { id: params.id },
        data: {
          name: body.name ? body.name.trim() : undefined,
          phone: body.phone ? body.phone.trim() : undefined,
          mobileNormalized,
          email: body.email !== undefined ? (body.email ? body.email.trim().toLowerCase() : null) : undefined,
          city: body.city !== undefined ? (body.city ? body.city.trim() : null) : undefined,
          company: body.company !== undefined ? (body.company ? body.company.trim() : null) : undefined,
          address: body.address !== undefined ? (body.address ? body.address.trim() : null) : undefined,
          state: body.state !== undefined ? (body.state ? body.state.trim() : null) : undefined,
          pincode: body.pincode !== undefined ? (body.pincode ? body.pincode.trim() : null) : undefined,
          gstin: body.gstin !== undefined ? (body.gstin ? body.gstin.trim().toUpperCase() : null) : undefined,
          notes: body.notes !== undefined ? (body.notes ? body.notes.trim() : null) : undefined,
          serviceType: body.serviceType,
          source: body.source,
          type: body.type,
          status: body.status,
          assignedToId: body.assignedToId,
        },
      });

      return NextResponse.json({
        success: true,
        data: { ...updated, createdAt: updated.createdAt.toISOString() },
      });
    } catch (updateErr: any) {
      if (
        updateErr.code === "P2002" ||
        updateErr.code === 11000 ||
        String(updateErr.message).includes("mobileNormalized")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "This mobile number is already linked to another customer.",
            code: "DUPLICATE_MOBILE",
          },
          { status: 409 }
        );
      }
      throw updateErr;
    }
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

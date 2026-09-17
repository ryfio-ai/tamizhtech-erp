import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        payments: true,
        items: true
      }
    });

    if (!invoice) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const formatted = {
      ...invoice,
      clientName: invoice.client.name,
      clientPhone: invoice.client.phone,
      clientEmail: invoice.client.email,
      clientCity: invoice.client.city,
      items: invoice.items,
      createdAt: invoice.createdAt.toISOString()
    };

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const current = await prisma.invoice.findUnique({ where: { id: params.id } });
    if (!current) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    const body = await req.json();

    // If invoice is already ISSUED/PAID, line items cannot be mutated directly because stock was already committed
    if (current.status !== "DRAFT" && body.items) {
      return NextResponse.json(
        { success: false, error: "Only DRAFT invoices can be directly edited. Please cancel and re-issue if items changed." },
        { status: 400 }
      );
    }

    let updates: any = { ...body };

    if (body.items) {
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: params.id } });
      updates.items = {
        create: body.items.map((item: any) => ({
          productId: item.productId || null,
          description: item.description,
          qty: item.qty,
          unitPrice: item.unitPrice,
          amount: (item.qty || 0) * (item.unitPrice || 0),
          configurationNotes: item.configurationNotes || null,
        })),
      };
    } else {
      delete updates.items;
    }

    const updated = await prisma.invoice.update({
      where: { id: params.id },
      data: updates,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("PUT Invoice Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: { payments: true },
    });
    if (!invoice) return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });

    if (invoice.payments.length > 0) {
      return NextResponse.json(
        { success: false, error: "Cannot delete invoice with associated payments. Reverse payments first." },
        { status: 400 }
      );
    }

    // Protection: Issued bills cannot be hard-deleted because stock was deducted and sequential number committed
    if (invoice.status !== "DRAFT") {
      return NextResponse.json(
        { success: false, error: "Issued invoices cannot be deleted. Please Cancel the invoice to safely restore inventory." },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.invoiceItem.deleteMany({ where: { invoiceId: params.id } }),
      prisma.invoice.delete({ where: { id: params.id } }),
    ]);

    return NextResponse.json({ success: true, data: null, message: "Draft invoice deleted successfully" });
  } catch (error: any) {
    console.error("DELETE Invoice Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

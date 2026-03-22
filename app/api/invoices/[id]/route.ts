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
    const body = await req.json();
    
    // Calculate new totals if updating financials
    let updates: any = { ...body };
      // For a relational DB, we should ideally use nested updates.
      // For now, let's keep it simple by updating the top-level. 
      // If items are provided in PUT, we need to handle them.
      if (body.items) {
          // Delete old items and create new ones for simplicity
          await prisma.invoiceItem.deleteMany({ where: { invoiceId: params.id } });
          updates.items = {
              create: body.items.map((item: any) => ({
                  description: item.description,
                  qty: item.qty,
                  unitPrice: item.unitPrice,
                  amount: (item.qty || 0) * (item.unitPrice || 0)
              }))
          };
      } else {
          delete updates.items;
      }

    const updated = await prisma.invoice.update({
      where: { id: params.id },
      data: updates
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: params.id }, include: { payments: true } });
    if (!invoice) throw new Error("Invoice not found");

    if (invoice.payments.length > 0) {
      return NextResponse.json({ success: false, error: "Cannot delete invoice with associated payments. Delete payments first." }, { status: 400 });
    }

    await prisma.invoice.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, data: null });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

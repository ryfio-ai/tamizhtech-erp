import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { toPaise, fromPaise, roundToPaise } from "@/lib/money";
import { getAuthoritativeInvoiceFinancials } from "@/lib/invoiceService";

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

    const financials = await getAuthoritativeInvoiceFinancials(params.id);

    const formatted = {
      ...invoice,
      subtotal: fromPaise(invoice.subtotal),
      gstAmount: fromPaise(invoice.gstAmount),
      discountAmount: fromPaise(invoice.discountAmount),
      total: fromPaise(invoice.total),
      paidAmount: fromPaise(invoice.paidAmount),
      balance: fromPaise(invoice.balance),
      clientName: invoice.client.name,
      clientPhone: invoice.client.phone,
      clientEmail: invoice.client.email,
      clientCity: invoice.client.city,
      items: invoice.items.map(it => ({
        ...it,
        unitPrice: fromPaise(it.unitPrice),
        amount: fromPaise(it.amount),
      })),
      financials,
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
        create: body.items.map((item: any) => {
          const qty = Math.max(1, Math.round(Number(item.qty) || 1));
          const unitPricePaise = toPaise(Number(item.unitPrice) || 0);
          const amountPaise = roundToPaise(qty * unitPricePaise);
          return {
            productId: item.productId || null,
            description: item.description,
            qty,
            unitPrice: unitPricePaise,
            amount: amountPaise,
            configurationNotes: item.configurationNotes || null,
          };
        }),
      };
    } else {
      delete updates.items;
    }

    if (updates.status === "CANCELLED" && current.status !== "CANCELLED") {
      updates.cancelledAt = new Date();
      const { reverseStockForCancelledInvoice } = await import("@/lib/stockService");
      await reverseStockForCancelledInvoice(params.id);
    } else if (updates.status === "ISSUED" && current.status === "DRAFT") {
      updates.issuedAt = new Date();
      const { deductStockForIssuedInvoice } = await import("@/lib/stockService");
      await deductStockForIssuedInvoice(params.id);
    }

    const updated = await prisma.invoice.update({
      where: { id: params.id },
      data: updates,
    });

    const financials = await getAuthoritativeInvoiceFinancials(params.id);

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        subtotal: fromPaise(updated.subtotal),
        gstAmount: fromPaise(updated.gstAmount),
        discountAmount: fromPaise(updated.discountAmount),
        total: fromPaise(updated.total),
        paidAmount: fromPaise(updated.paidAmount),
        balance: fromPaise(updated.balance),
        financials,
      },
    });
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

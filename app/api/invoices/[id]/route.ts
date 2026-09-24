import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { toPaise, fromPaise, roundToPaise } from "@/lib/money";
import { getAuthoritativeInvoiceFinancials } from "@/lib/invoiceService";
import { getNormalizedInvoiceData } from "@/lib/businessDocumentData";
import { reconcileStockForUpdatedInvoice, reverseStockForCancelledInvoice, deductStockForIssuedInvoice } from "@/lib/stockService";

export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        payments: true,
        items: true,
      },
    });

    if (!invoice) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const [financials, documentData] = await Promise.all([
      getAuthoritativeInvoiceFinancials(params.id),
      getNormalizedInvoiceData(params.id),
    ]);

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
      items: invoice.items.map((it) => ({
        ...it,
        unitPrice: fromPaise(it.unitPrice),
        amount: fromPaise(it.amount),
      })),
      financials,
      documentData,
      createdAt: invoice.createdAt.toISOString(),
    };

    return NextResponse.json({ success: true, data: formatted, documentData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const current = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: { payments: true, items: true },
    });

    if (!current) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    const body = await req.json();

    // Verify client if changed
    let clientId = current.clientId;
    let clientName = current.clientName;
    if (body.clientId && body.clientId !== current.clientId) {
      const client = await prisma.client.findUnique({ where: { id: body.clientId } });
      if (client) {
        clientId = client.id;
        clientName = client.name;
      }
    }

    const hadItems = Array.isArray(body.items) && body.items.length > 0;
    let subtotalPaise = current.subtotal;
    let discountAmountPaise = current.discountAmount;
    let gstAmountPaise = current.gstAmount;
    let totalPaise = current.total;

    const gstPercent =
      body.gstPercent !== undefined && body.gstPercent !== null && String(body.gstPercent).trim() !== ""
        ? Number(body.gstPercent)
        : typeof current.gstPercent === "number"
        ? current.gstPercent
        : 18;

    const discountPercent =
      body.discountPercent !== undefined && body.discountPercent !== null && String(body.discountPercent).trim() !== ""
        ? Number(body.discountPercent)
        : 0;

    let processedItems: any[] = [];
    if (hadItems) {
      processedItems = body.items.map((item: any) => {
        const qty = Math.max(1, Math.round(Number(item.qty) || 1));
        const unitPricePaise = toPaise(Number(item.unitPrice) || 0);
        const amountPaise = roundToPaise(qty * unitPricePaise);
        return {
          invoiceId: params.id,
          productId: item.productId || null,
          description: item.description || "Line Item",
          qty,
          unitPrice: unitPricePaise,
          amount: amountPaise,
          configurationNotes: item.configurationNotes?.trim() || null,
        };
      });

      subtotalPaise = processedItems.reduce((sum: number, it: any) => sum + it.amount, 0);
      discountAmountPaise = roundToPaise(subtotalPaise * (discountPercent / 100));
      const taxablePaise = Math.max(0, subtotalPaise - discountAmountPaise);
      gstAmountPaise = roundToPaise(taxablePaise * (gstPercent / 100));
      totalPaise = Math.max(0, taxablePaise + gstAmountPaise);
    }

    // Ledger payment reconciliation
    let netPaidAmountPaise = 0;
    if (current.payments && current.payments.length > 0) {
      for (const p of current.payments) {
        if (p.status === "COMPLETED") {
          if (p.type === "PAYMENT" || p.type === "ADJUSTMENT") {
            netPaidAmountPaise += p.amount;
          } else if (p.type === "REVERSAL") {
            netPaidAmountPaise -= p.amount;
          }
        }
      }
    }
    netPaidAmountPaise = Math.max(0, netPaidAmountPaise);
    const balancePaise = Math.max(0, totalPaise - netPaidAmountPaise);

    let nextStatus = body.status || current.status;
    if (nextStatus !== "CANCELLED") {
      if (balancePaise <= 0 && totalPaise > 0) {
        nextStatus = "PAID";
      } else if (netPaidAmountPaise > 0 && balancePaise > 0) {
        nextStatus = "PARTIALLY_PAID";
      }
    }

    // Atomic update of line items & invoice
    await prisma.$transaction(async (tx) => {
      if (hadItems) {
        await tx.invoiceItem.deleteMany({ where: { invoiceId: params.id } });
        await tx.invoiceItem.createMany({ data: processedItems });
      }

      await tx.invoice.update({
        where: { id: params.id },
        data: {
          clientId,
          clientName,
          date: body.date ? new Date(body.date) : current.date,
          dueDate: body.dueDate ? new Date(body.dueDate) : current.dueDate,
          notes: body.notes !== undefined ? body.notes : current.notes,
          subtotal: subtotalPaise,
          gstPercent,
          gstAmount: gstAmountPaise,
          discountAmount: discountAmountPaise,
          total: totalPaise,
          paidAmount: netPaidAmountPaise,
          balance: balancePaise,
          status: nextStatus,
          issuedAt:
            nextStatus === "ISSUED" && !current.issuedAt
              ? new Date()
              : current.issuedAt,
          cancelledAt:
            nextStatus === "CANCELLED" && !current.cancelledAt
              ? new Date()
              : current.cancelledAt,
        },
      });
    });

    // Stock adjustment and reconciliation
    if (nextStatus === "CANCELLED" && current.status !== "CANCELLED") {
      await reverseStockForCancelledInvoice(params.id);
    } else if (current.status === "ISSUED" && nextStatus === "ISSUED") {
      // Reconcile stock for modified line items
      if (hadItems) {
        await reconcileStockForUpdatedInvoice(params.id);
      }
    } else if (current.status === "DRAFT" && nextStatus === "ISSUED") {
      await deductStockForIssuedInvoice(params.id);
    }

    const financials = await getAuthoritativeInvoiceFinancials(params.id);

    const updated = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: { client: true, items: true, payments: true },
    });

    if (!updated) {
      return NextResponse.json({ success: false, error: "Failed to reload updated invoice" }, { status: 500 });
    }

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
        items: updated.items.map((it) => ({
          ...it,
          unitPrice: fromPaise(it.unitPrice),
          amount: fromPaise(it.amount),
        })),
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

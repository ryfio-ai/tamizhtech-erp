import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { toPaise, fromPaise, roundToPaise } from "@/lib/money";
import { getAuthoritativeInvoiceFinancials } from "@/lib/invoiceService";
import { getNormalizedInvoiceData } from "@/lib/businessDocumentData";
import { reconcileStockForUpdatedInvoice, reverseStockForCancelledInvoice, deductStockForIssuedInvoice } from "@/lib/stockService";
import { allocateInvoiceNoTx } from "@/lib/sequence";

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

    let rawShippingPaise = 0;
    try {
      const client = await clientPromise;
      const raw = await client.db().collection("Invoice").findOne(
        { _id: new ObjectId(params.id) },
        { projection: { shippingCharge: 1, shippingAmount: 1 } }
      );
      if (raw?.shippingCharge !== undefined && raw.shippingCharge !== null) {
        rawShippingPaise = Number(raw.shippingCharge) || 0;
      } else if (raw?.shippingAmount !== undefined && raw.shippingAmount !== null) {
        rawShippingPaise = toPaise(Number(raw.shippingAmount) || 0);
      }
    } catch (mongoErr) {
      console.warn("MongoDB shipping charge read note:", mongoErr);
    }

    const formatted = {
      ...invoice,
      subtotal: fromPaise(invoice.subtotal),
      gstAmount: fromPaise(invoice.gstAmount),
      discountAmount: fromPaise(invoice.discountAmount),
      shippingCharge: fromPaise(rawShippingPaise),
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

    let shippingChargePaise = 0;
    if (body.shippingCharge !== undefined && body.shippingCharge !== null) {
      shippingChargePaise = Math.max(0, toPaise(Number(body.shippingCharge) || 0));
    } else {
      try {
        const client = await clientPromise;
        const raw = await client.db().collection("Invoice").findOne(
          { _id: new ObjectId(params.id) },
          { projection: { shippingCharge: 1, shippingAmount: 1 } }
        );
        if (raw?.shippingCharge !== undefined && raw.shippingCharge !== null) {
          shippingChargePaise = Number(raw.shippingCharge) || 0;
        } else if (raw?.shippingAmount !== undefined && raw.shippingAmount !== null) {
          shippingChargePaise = toPaise(Number(raw.shippingAmount) || 0);
        }
      } catch (mongoErr) {
        console.warn("MongoDB shipping charge read note:", mongoErr);
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
      totalPaise = Math.max(0, taxablePaise + gstAmountPaise + shippingChargePaise);
    } else if (body.shippingCharge !== undefined) {
      const taxablePaise = Math.max(0, subtotalPaise - discountAmountPaise);
      totalPaise = Math.max(0, taxablePaise + gstAmountPaise + shippingChargePaise);
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

    const isDraftPromotion =
      current.invoiceNo.startsWith("DRAFT-") &&
      nextStatus !== "DRAFT" &&
      nextStatus !== "CANCELLED";
    let officialInvoiceNo = current.invoiceNo;

    // Atomic update of line items & invoice
    await prisma.$transaction(async (tx) => {
      if (isDraftPromotion) {
        officialInvoiceNo = await allocateInvoiceNoTx(tx);
      }

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
          ...(isDraftPromotion
            ? {
                invoiceNo: officialInvoiceNo,
                issuedAt: current.issuedAt || new Date(),
              }
            : {
                issuedAt:
                  nextStatus === "ISSUED" && !current.issuedAt
                    ? new Date()
                    : current.issuedAt,
              }),
          cancelledAt:
            nextStatus === "CANCELLED" && !current.cancelledAt
              ? new Date()
              : current.cancelledAt,
        },
      });
    });

    // Update shipping charge directly in MongoDB document
    if (body.shippingCharge !== undefined && body.shippingCharge !== null) {
      try {
        const client = await clientPromise;
        await client.db().collection("Invoice").updateOne(
          { _id: new ObjectId(params.id) },
          { $set: { shippingCharge: shippingChargePaise } }
        );
      } catch (err) {
        console.warn("Failed to update shippingCharge in MongoDB:", err);
      }
    }

    // Stock adjustment and reconciliation
    if (nextStatus === "CANCELLED" && current.status !== "CANCELLED") {
      await reverseStockForCancelledInvoice(params.id);
    } else if (current.status === "ISSUED" && nextStatus === "ISSUED") {
      // Reconcile stock for modified line items
      if (hadItems) {
        await reconcileStockForUpdatedInvoice(params.id);
      }
    } else if ((current.status === "DRAFT" || isDraftPromotion) && (nextStatus === "ISSUED" || nextStatus === "PAID" || nextStatus === "PARTIALLY_PAID")) {
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
        shippingCharge: fromPaise(shippingChargePaise),
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
      include: { payments: true, items: true },
    });
    if (!invoice) return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });

    // 1. If physical inventory was deducted, safely return it to stock
    if (invoice.status !== "DRAFT" && invoice.status !== "CANCELLED") {
      await reverseStockForCancelledInvoice(params.id);
    }

    // 2. Mark invoice as CANCELLED (Void) preserving audit number continuity
    await prisma.invoice.update({
      where: { id: params.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: null,
      message: `Bill ${invoice.invoiceNo} marked as CANCELLED (Void). Sequential number is preserved for audit continuity.`,
    });
  } catch (error: any) {
    console.error("DELETE Invoice Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

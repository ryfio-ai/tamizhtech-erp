import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { fromPaise, roundMoney, toPaise } from "@/lib/money";
import { getNormalizedQuotationData } from "@/lib/businessDocumentData";
import { allocateQuotationNoTx } from "@/lib/sequence";
import { getSystemSetting } from "@/lib/settings";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [quotation, documentData] = await Promise.all([
      prisma.quotation.findUnique({
        where: { id: params.id },
        include: {
          client: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      }),
      getNormalizedQuotationData(params.id),
    ]);

    if (!quotation) {
      return NextResponse.json({ success: false, error: "Quotation not found" }, { status: 404 });
    }

    const formatted = {
      ...quotation,
      subtotal: fromPaise(quotation.subtotal),
      discountAmount: fromPaise(quotation.discountAmount),
      taxAmount: fromPaise(quotation.taxAmount),
      total: fromPaise(quotation.total),
      items: quotation.items.map((it) => ({
        ...it,
        unitPrice: fromPaise(it.unitPrice),
        amount: fromPaise(it.amount),
      })),
      documentData,
    };

    return NextResponse.json({ success: true, quotation: formatted, documentData });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch quotation" },
      { status: 500 }
    );
  }
}

async function handleUpdateQuotation(req: NextRequest, params: { id: string }) {
  try {
    const body = await req.json();
    const { status, notes, terms, clientId, validUntil, items } = body;

    const allowedStatuses = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"];
    const data: any = {};

    const currentQuotation = await prisma.quotation.findUnique({
      where: { id: params.id },
      include: {
        orders: true,
      },
    });

    if (!currentQuotation) {
      return NextResponse.json({ success: false, error: "Quotation not found" }, { status: 404 });
    }

    if (status) {
      if (!allowedStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: `Invalid status. Allowed: ${allowedStatuses.join(", ")}` },
          { status: 400 }
        );
      }
      data.status = status;
    }

    if (notes !== undefined) data.notes = notes;
    if (terms !== undefined) data.terms = terms;

    if (clientId) {
      const client = await prisma.client.findUnique({ where: { id: clientId } });
      if (!client) {
        return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 });
      }
      data.clientId = clientId;
    }

    if (validUntil) {
      data.validUntil = new Date(validUntil);
    }

    // Process line items if provided
    let processedItems: any[] | null = null;
    let calculatedSubtotal = 0;
    let calculatedDiscount = 0;
    let calculatedTax = 0;

    if (Array.isArray(items)) {
      const hasLinkedOrder = currentQuotation.orders && currentQuotation.orders.length > 0;
      const hasLinkedInvoice = !!currentQuotation.convertedToInvoiceId;
      if (hasLinkedOrder || hasLinkedInvoice) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot modify line items for a quotation that has already been converted to a Sales Order or Invoice.",
          },
          { status: 400 }
        );
      }

      if (items.length === 0) {
        return NextResponse.json(
          { success: false, error: "At least one item is required in the quotation" },
          { status: 400 }
        );
      }

      const defaultGstRate = (await getSystemSetting("DEFAULT_GST_RATE")) || 18;
      processedItems = [];

      for (const item of items) {
        const qty = parseFloat(item.qty);
        if (isNaN(qty) || qty <= 0) {
          return NextResponse.json(
            { success: false, error: "Item quantity must be greater than 0" },
            { status: 400 }
          );
        }

        let unitPrice = parseFloat(item.unitPrice);
        let itemType = item.itemType || "PHYSICAL_PRODUCT";
        let sku = item.sku || null;
        let name = item.name || item.description || "Item";

        if (item.productId) {
          const product = await prisma.product.findUnique({ where: { id: item.productId } });
          if (product) {
            if (isNaN(unitPrice)) {
              unitPrice = product.basePrice ?? 0;
            }
            itemType = product.type || itemType;
            sku = product.sku || sku;
            name = product.name || name;
          }
        }

        const cleanUnitPrice = roundMoney(isNaN(unitPrice) ? 0 : unitPrice);
        const unitPricePaise = toPaise(cleanUnitPrice);
        const intQty = Math.max(1, Math.round(parseFloat(item.qty) || 1));
        const discountPercent = Math.max(0, Math.min(100, parseFloat(item.discountPercent) || 0));
        const lineTaxRate = typeof item.taxRate === "number" ? item.taxRate : defaultGstRate;

        const grossAmountPaise = Math.round(intQty * unitPricePaise);
        const discountAmountPaise = Math.round(grossAmountPaise * (discountPercent / 100));
        const netAmountPaise = grossAmountPaise - discountAmountPaise;
        const taxAmountPaise = Math.round(netAmountPaise * (lineTaxRate / 100));

        calculatedSubtotal = calculatedSubtotal + grossAmountPaise;
        calculatedDiscount = calculatedDiscount + discountAmountPaise;
        calculatedTax = calculatedTax + taxAmountPaise;

        processedItems.push({
          productId: item.productId || null,
          itemType,
          sku,
          name,
          description: item.description || name,
          configurationNotes: item.configurationNotes || null,
          qty: intQty,
          unitPrice: unitPricePaise,
          discountPercent,
          taxRate: lineTaxRate,
          amount: netAmountPaise,
        });
      }

      data.subtotal = calculatedSubtotal;
      data.discountAmount = calculatedDiscount;
      data.taxAmount = calculatedTax;
      data.total = calculatedSubtotal - calculatedDiscount + calculatedTax;
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Allocate official sequence number when transitioning from DRAFT to SENT (or ACCEPTED)
      if (
        (status === "SENT" || status === "ACCEPTED") &&
        currentQuotation.quotationNo.startsWith("DRAFT-")
      ) {
        data.quotationNo = await allocateQuotationNoTx(tx);
      }

      // If items were provided, delete old and recreate
      if (processedItems) {
        await tx.quotationItem.deleteMany({
          where: { quotationId: params.id },
        });
        data.items = {
          create: processedItems,
        };
      }

      return tx.quotation.update({
        where: { id: params.id },
        data,
        include: {
          client: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });

    const formatted = {
      ...updated,
      subtotal: fromPaise(updated.subtotal),
      discountAmount: fromPaise(updated.discountAmount),
      taxAmount: fromPaise(updated.taxAmount),
      total: fromPaise(updated.total),
      items: updated.items.map((it) => ({
        ...it,
        unitPrice: fromPaise(it.unitPrice),
        amount: fromPaise(it.amount),
      })),
    };

    return NextResponse.json({ success: true, quotation: formatted });
  } catch (error: any) {
    console.error("Failed to update quotation:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update quotation" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return handleUpdateQuotation(req, params);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  return handleUpdateQuotation(req, params);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: params.id },
      include: {
        orders: true,
      },
    });

    if (!quotation) {
      return NextResponse.json({ success: false, error: "Quotation not found" }, { status: 404 });
    }

    // Boundary check: Check if converted or linked to sales order or invoice
    const hasLinkedOrder = quotation.orders && quotation.orders.length > 0;
    const hasLinkedInvoice = !!quotation.convertedToInvoiceId;
    const isAccepted = quotation.status === "ACCEPTED";

    if (hasLinkedOrder || hasLinkedInvoice || isAccepted) {
      // Downstream business relationship exists: Transition to CANCELLED instead of hard-deleting
      const updated = await prisma.quotation.update({
        where: { id: params.id },
        data: { status: "CANCELLED" },
      });
      return NextResponse.json({
        success: true,
        action: "CANCELLED",
        message: "Quotation has downstream records and cannot be permanently deleted. Status changed to CANCELLED to preserve audit trail.",
        quotation: updated,
      });
    }

    // Eligible DRAFT / unlinked quotation: Safe hard delete of child items then parent
    await prisma.quotationItem.deleteMany({
      where: { quotationId: params.id },
    });

    await prisma.quotation.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      action: "DELETED",
      message: "Quotation deleted permanently from ERP.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete quotation" },
      { status: 500 }
    );
  }
}



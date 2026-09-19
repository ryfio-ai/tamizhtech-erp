import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { allocateQuotationNoTx, generateDraftQuotationNo } from "@/lib/sequence";
import { getSystemSetting } from "@/lib/settings";
import { roundMoney, safeAdd, toPaise, fromPaise } from "@/lib/money";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const status = searchParams.get("status");

    const where: any = {};
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;

    const quotations = await prisma.quotation.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true,
            phone: true,
            mobileNormalized: true,
            email: true,
            city: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                type: true,
                basePrice: true,
                stockQuantity: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = quotations.map((q) => ({
      ...q,
      subtotal: fromPaise(q.subtotal),
      discountAmount: fromPaise(q.discountAmount),
      taxAmount: fromPaise(q.taxAmount),
      total: fromPaise(q.total),
      items: q.items.map((it) => ({
        ...it,
        unitPrice: fromPaise(it.unitPrice),
        amount: fromPaise(it.amount),
      })),
    }));

    return NextResponse.json({ success: true, quotations: formatted });
  } catch (error: any) {
    console.error("Failed to fetch quotations:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch quotations" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      clientId,
      validUntil,
      items = [],
      notes,
      terms,
      createdById,
    } = body;

    if (!clientId) {
      return NextResponse.json({ success: false, error: "Client is required" }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one item is required in the quotation" },
        { status: 400 }
      );
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 });
    }

    // Snapshot dynamic GST rate from SystemSetting (no hardcoded 18%)
    const defaultGstRate = await getSystemSetting("DEFAULT_GST_RATE");
    const defaultValidityDays = await getSystemSetting("QUOTATION_VALIDITY_DAYS");
    const defaultTerms = await getSystemSetting("DEFAULT_QUOTATION_TERMS");

    let calculatedSubtotal = 0;
    let calculatedDiscount = 0;
    let calculatedTax = 0;

    const processedItems: any[] = [];

    for (const item of items) {
      const qty = parseFloat(item.qty);
      if (isNaN(qty) || qty <= 0) {
        return NextResponse.json(
          { success: false, error: "Item quantity must be greater than 0" },
          { status: 400 }
        );
      }

      // Quoted rate defaults from product master if not provided, but master is NEVER mutated
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
      // Dynamic tax snapshot: use item tax rate or fall back to system setting
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

    const calculatedTotal = calculatedSubtotal - calculatedDiscount + calculatedTax;

    const initialStatus = body.status === "SENT" ? "SENT" : "DRAFT";

    const validityDate = validUntil
      ? new Date(validUntil)
      : new Date(Date.now() + (defaultValidityDays || 30) * 24 * 60 * 60 * 1000);

    const quotation = await prisma.$transaction(async (tx) => {
      let quotationNo: string;
      if (initialStatus === "SENT") {
        quotationNo = await allocateQuotationNoTx(tx);
      } else {
        quotationNo = generateDraftQuotationNo();
      }

      return tx.quotation.create({
        data: {
          quotationNo,
          clientId,
          status: initialStatus,
          validUntil: validityDate,
          subtotal: calculatedSubtotal,
          discountAmount: calculatedDiscount,
          taxAmount: calculatedTax,
          total: calculatedTotal,
          notes: notes || null,
          terms: terms || defaultTerms || null,
          createdById: createdById || null,
          items: {
            create: processedItems,
          },
        },
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

    const formattedQuotation = {
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
    };

    return NextResponse.json({ success: true, quotation: formattedQuotation });
  } catch (error: any) {
    console.error("Failed to create quotation:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create quotation" },
      { status: 500 }
    );
  }
}

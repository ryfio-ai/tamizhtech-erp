import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateSourcingNo } from "@/lib/sequence";
import { recordStockMovement } from "@/lib/costService";
import { roundMoney, toPaise, fromPaise } from "@/lib/money";
import { invalidateStockCache } from "@/lib/cache";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const sourceType = searchParams.get("sourceType");
    const status = searchParams.get("status");

    const where: any = {};
    if (productId) where.productId = productId;
    if (sourceType) where.sourceType = sourceType;
    if (status) where.status = status;

    const sourcings = await prisma.inventorySourcing.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            stockQuantity: true,
            type: true,
            category: true,
          },
        },
        payments: {
          orderBy: { paymentDate: "desc" },
        },
      },
      orderBy: { purchaseDate: "desc" },
    });

    const formatted = sourcings.map((s) => {
      const netPaidPaise = s.payments
        .filter((p) => p.type === "PAYMENT")
        .reduce((sum, p) => sum + p.amount, 0)
        - s.payments
        .filter((p) => p.type === "REVERSAL")
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        ...s,
        unitCost: fromPaise(s.unitCost),
        totalCost: fromPaise(s.totalCost),
        paidAmount: fromPaise(netPaidPaise),
        payments: s.payments.map((p) => ({
          ...p,
          amount: fromPaise(p.amount),
        })),
      };
    });

    return NextResponse.json({ success: true, sourcings: formatted });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch sourcing records" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      productId,
      quantity,
      sourceType,
      unitCost,
      vendorName,
      purchaseDate,
      initialPaidAmount = 0,
      paymentMethod = "BANK_TRANSFER",
      referenceNo,
      notes,
      createdById,
    } = body;

    if (!productId) {
      return NextResponse.json({ success: false, error: "Product is required" }, { status: 400 });
    }

    const parsedQty = Math.max(1, Math.round(parseFloat(quantity) || 1));

    const cleanUnitCost = roundMoney(parseFloat(unitCost) || 0);
    if (cleanUnitCost < 0) {
      return NextResponse.json({ success: false, error: "Unit cost cannot be negative" }, { status: 400 });
    }
    const unitCostPaise = toPaise(cleanUnitCost);

    if (!["ONLINE", "OFFLINE", "IN_HOUSE"].includes(sourceType)) {
      return NextResponse.json(
        { success: false, error: "sourceType must be ONLINE, OFFLINE, or IN_HOUSE" },
        { status: 400 }
      );
    }

    const totalCostPaise = Math.round(parsedQty * unitCostPaise);
    const initialPaidPaise = toPaise(parseFloat(initialPaidAmount) || 0);
    const cleanPaidPaise = Math.min(Math.max(0, initialPaidPaise), totalCostPaise);

    let paymentStatus: "UNPAID" | "PARTIAL" | "PAID" = "UNPAID";
    if (cleanPaidPaise >= totalCostPaise && totalCostPaise > 0) {
      paymentStatus = "PAID";
    } else if (cleanPaidPaise > 0) {
      paymentStatus = "PARTIAL";
    }

    const sourcingNo = await generateSourcingNo();
    const effectivePurchaseDate = purchaseDate ? new Date(purchaseDate) : new Date();
    const paidAt = cleanPaidPaise > 0 ? effectivePurchaseDate : null;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, quantityScale: true },
    });
    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const scale = product.quantityScale || 1;
    const quantityMinor = Math.round(parsedQty * scale);

    // Create sourcing record with ACTIVE status
    const sourcing = await prisma.inventorySourcing.create({
      data: {
        sourcingNo,
        productId,
        quantityMinor,
        quantity: parsedQty,
        sourceType,
        vendorName: vendorName || (sourceType === "IN_HOUSE" ? "TamizhTech In-House Lab" : null),
        unitCostPaise,
        unitCost: unitCostPaise,
        totalCostPaise,
        totalCost: totalCostPaise,
        purchaseDate: effectivePurchaseDate,
        status: "ACTIVE",
        paymentStatus,
        paidAmountPaise: cleanPaidPaise,
        paidAmount: cleanPaidPaise,
        paidAt,
        paymentMethod: cleanPaidPaise > 0 ? paymentMethod : null,
        referenceNo: referenceNo || null,
        notes: notes || null,
        createdById: createdById || null,
      },
    });

    // If initial payment was made, log payment ledger entry with type PAYMENT and direction INCREASE
    if (cleanPaidPaise > 0) {
      await prisma.inventorySourcingPayment.create({
        data: {
          sourcingId: sourcing.id,
          amountPaise: cleanPaidPaise,
          amount: cleanPaidPaise,
          direction: "INCREASE",
          type: "PAYMENT",
          paymentDate: effectivePurchaseDate,
          paymentMethod,
          paymentReference: referenceNo || null,
          notes: "Initial sourcing payment",
          createdById: createdById || null,
        },
      });
    }

    // Physical Movement: IN_HOUSE = PRODUCTION, ONLINE/OFFLINE = PURCHASE
    const movementType = sourceType === "IN_HOUSE" ? "PRODUCTION" : "PURCHASE";
    const movementResult = await recordStockMovement({
      productId,
      quantitySigned: parsedQty,
      type: movementType,
      inboundUnitCostPaise: unitCostPaise,
      referenceType: "INVENTORY_SOURCING",
      referenceId: sourcing.id,
      notes: `Sourcing ${sourcingNo} (${sourceType})`,
      createdById: createdById || null,
      effectiveAt: effectivePurchaseDate,
      createdAt: effectivePurchaseDate,
    });

    await invalidateStockCache(productId);

    const fullSourcing = await prisma.inventorySourcing.findUnique({
      where: { id: sourcing.id },
      include: {
        product: true,
        payments: true,
      },
    });

    const formattedSourcing = fullSourcing
      ? {
          ...fullSourcing,
          unitCost: fromPaise(fullSourcing.unitCost),
          totalCost: fromPaise(fullSourcing.totalCost),
          paidAmount: fromPaise(fullSourcing.paidAmount),
          payments: fullSourcing.payments.map((p) => ({
            ...p,
            amount: fromPaise(p.amount),
          })),
        }
      : sourcing;

    return NextResponse.json({
      success: true,
      sourcing: formattedSourcing,
      movement: movementResult,
    });
  } catch (error: any) {
    console.error("Failed to create sourcing record:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create sourcing record" },
      { status: 500 }
    );
  }
}

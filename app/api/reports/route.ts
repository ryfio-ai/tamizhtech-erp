import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getProductInventoryStateAsOf } from "@/lib/costService";
import { fromPaise } from "@/lib/money";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Default to current month if not provided
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : defaultStart;
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : defaultEnd;
    const asOfDate = searchParams.get("asOfDate") ? new Date(searchParams.get("asOfDate")!) : endDate;

    // ─────────────────────────────────────────────────────────────
    // PILLAR 1: SALES (Accrual Basis in Period)
    // ─────────────────────────────────────────────────────────────
    const issuedInvoicesInPeriod = await prisma.invoice.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID"] },
      },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    let productSalesInvoicedPaise = 0;
    let serviceSalesInvoicedPaise = 0;
    let taxOnIssuedInvoicesPaise = 0;
    let grossInvoicedTotalPaise = 0;
    let discountsGivenPaise = 0;

    for (const inv of issuedInvoicesInPeriod) {
      grossInvoicedTotalPaise += inv.total;
      taxOnIssuedInvoicesPaise += inv.gstAmount;
      discountsGivenPaise += inv.discountAmount;

      for (const item of inv.items) {
        const itemType = item.product?.type || "PHYSICAL_PRODUCT";
        if (itemType === "SERVICE") {
          serviceSalesInvoicedPaise += item.amount;
        } else {
          productSalesInvoicedPaise += item.amount;
        }
      }
    }

    // ─────────────────────────────────────────────────────────────
    // PILLAR 2: CASH FLOW (Actual Liquidity via Payment Ledgers)
    // ─────────────────────────────────────────────────────────────
    // 1. Customer Payments Received in period (by event date, net of reversals)
    const customerPayments = await prisma.payment.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        status: "COMPLETED",
      },
    });

    let customerCashInflowPaise = 0;
    for (const pay of customerPayments) {
      if (pay.type === "REVERSAL") {
        customerCashInflowPaise -= pay.amount;
      } else {
        customerCashInflowPaise += pay.amount;
      }
    }

    // 2. Inventory Payments Made in period (via InventorySourcingPayment ledger)
    const sourcingPaymentsInPeriod = await prisma.inventorySourcingPayment.findMany({
      where: {
        paymentDate: { gte: startDate, lte: endDate },
      },
    });

    const inventoryCashOutflowPaise = sourcingPaymentsInPeriod.reduce(
      (sum, p) => sum + p.amount,
      0
    );

    // 3. Operating Expense Payments Made in period (via ExpensePayment ledger)
    const expensePaymentsInPeriod = await prisma.expensePayment.findMany({
      where: {
        paymentDate: { gte: startDate, lte: endDate },
        expense: {
          status: { not: "VOIDED" },
        },
      },
      include: {
        expense: { select: { category: true, status: true } },
      },
    });

    const operatingCashOutflowPaise = expensePaymentsInPeriod.reduce(
      (sum, p) => sum + p.amount,
      0
    );

    const totalCashOutflowPaise = inventoryCashOutflowPaise + operatingCashOutflowPaise;
    const netCashMovementPaise = customerCashInflowPaise - totalCashOutflowPaise;

    // Expense payments categorized in rupees
    const expensesByCategory: Record<string, number> = {};
    for (const ep of expensePaymentsInPeriod) {
      const cat = ep.expense.category || "OTHER";
      const catPaise = ((expensesByCategory[cat] || 0) * 100) + ep.amount;
      expensesByCategory[cat] = fromPaise(catPaise);
    }

    // ─────────────────────────────────────────────────────────────
    // PILLAR 3: INVENTORY & SOURCING POSITION
    // ─────────────────────────────────────────────────────────────
    // 1. Incurred Sourcing in Period (by purchaseDate)
    const sourcingsInPeriod = await prisma.inventorySourcing.findMany({
      where: {
        purchaseDate: { gte: startDate, lte: endDate },
      },
      include: {
        payments: true,
      },
    });

    let totalSourcingCostIncurredPaise = 0;
    let onlineSourcingCostPaise = 0;
    let offlineSourcingCostPaise = 0;
    let inHouseProductionCostPaise = 0;
    let externalSourcingPayablePaise = 0;

    for (const src of sourcingsInPeriod) {
      totalSourcingCostIncurredPaise += src.totalCost;

      if (src.sourceType === "ONLINE") {
        onlineSourcingCostPaise += src.totalCost;
        const unpaid = Math.max(0, src.totalCost - src.paidAmount);
        externalSourcingPayablePaise += unpaid;
      } else if (src.sourceType === "OFFLINE") {
        offlineSourcingCostPaise += src.totalCost;
        const unpaid = Math.max(0, src.totalCost - src.paidAmount);
        externalSourcingPayablePaise += unpaid;
      } else if (src.sourceType === "IN_HOUSE") {
        // IN_HOUSE is inventory cost, NOT an external supplier payable
        inHouseProductionCostPaise += src.totalCost;
      }
    }

    // 2. Physical Stock Movements in Period
    const movementsInPeriod = await prisma.stockLedgerEntry.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    let purchaseUnits = 0;
    let productionUnits = 0;
    let saleUnits = 0;
    let damageUnits = 0;
    let returnUnits = 0;
    let adjustmentUnits = 0;

    for (const mov of movementsInPeriod) {
      const qty = Math.abs(mov.quantitySigned);
      switch (mov.type) {
        case "PURCHASE":
          purchaseUnits += qty;
          break;
        case "PRODUCTION":
          productionUnits += qty;
          break;
        case "SALE":
          saleUnits += qty;
          break;
        case "DAMAGE":
          damageUnits += qty;
          break;
        case "RETURN":
        case "CUSTOMER_RETURN":
          returnUnits += qty;
          break;
        case "ADJUSTMENT":
          adjustmentUnits += mov.quantitySigned;
          break;
      }
    }

    // 3. Historical Point-in-Time Inventory Valuation as of asOfDate
    const products = await prisma.product.findMany({
      where: {
        type: "PHYSICAL_PRODUCT",
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        sku: true,
      },
    });

    let totalInventoryValuationPaise = 0;
    const inventoryValuationList = [];

    for (const prod of products) {
      const state = await getProductInventoryStateAsOf(prod.id, asOfDate);
      totalInventoryValuationPaise += state.valuationPaise;

      inventoryValuationList.push({
        id: prod.id,
        name: prod.name,
        sku: prod.sku,
        stockQuantity: state.closingQty,
        rollingWAC: state.rollingWACRupees,
        valuation: state.valuationRupees,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // POINT-IN-TIME CUSTOMER RECEIVABLES (As of Report Date)
    // ─────────────────────────────────────────────────────────────
    // Invoices validly issued on or before asOfDate (not cancelled on or before asOfDate)
    const validInvoicesToDate = await prisma.invoice.findMany({
      where: {
        date: { lte: asOfDate },
        status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID", "CANCELLED"] },
      },
      select: {
        id: true,
        total: true,
        status: true,
        cancelledAt: true,
      },
    });

    let cumulativeInvoicedAsOfDatePaise = 0;
    for (const inv of validInvoicesToDate) {
      // If invoice was cancelled on or before asOfDate, exclude it from historical receivables
      if (inv.status === "CANCELLED" && inv.cancelledAt && inv.cancelledAt <= asOfDate) {
        continue;
      }
      cumulativeInvoicedAsOfDatePaise += inv.total;
    }

    // Payments received on or before asOfDate
    const validPaymentsToDate = await prisma.payment.findMany({
      where: {
        date: { lte: asOfDate },
        status: "COMPLETED",
      },
      select: {
        amount: true,
        type: true,
      },
    });

    let cumulativePaymentsAsOfDatePaise = 0;
    for (const pay of validPaymentsToDate) {
      if (pay.type === "REVERSAL") {
        cumulativePaymentsAsOfDatePaise -= pay.amount;
      } else {
        cumulativePaymentsAsOfDatePaise += pay.amount;
      }
    }

    const customerOutstandingAsOfDatePaise = Math.max(
      0,
      cumulativeInvoicedAsOfDatePaise - cumulativePaymentsAsOfDatePaise
    );

    return NextResponse.json({
      success: true,
      period: {
        startDate,
        endDate,
        asOfDate,
      },
      sales: {
        productSalesInvoiced: fromPaise(productSalesInvoicedPaise),
        serviceSalesInvoiced: fromPaise(serviceSalesInvoicedPaise),
        taxOnIssuedInvoices: fromPaise(taxOnIssuedInvoicesPaise), // Explicitly named, never "Tax Collected"
        discountsGiven: fromPaise(discountsGivenPaise),
        grossInvoicedTotal: fromPaise(grossInvoicedTotalPaise),
        invoicesCount: issuedInvoicesInPeriod.length,
      },
      cashFlow: {
        customerPaymentsReceived: fromPaise(customerCashInflowPaise),
        inventoryPaymentsPaid: fromPaise(inventoryCashOutflowPaise),
        operatingExpensesPaid: fromPaise(operatingCashOutflowPaise),
        totalCashOutflow: fromPaise(totalCashOutflowPaise),
        netCashMovement: fromPaise(netCashMovementPaise),
        expensesByCategory,
      },
      inventory: {
        totalSourcingCostIncurred: fromPaise(totalSourcingCostIncurredPaise),
        onlineSourcingCost: fromPaise(onlineSourcingCostPaise),
        offlineSourcingCost: fromPaise(offlineSourcingCostPaise),
        inHouseProductionCost: fromPaise(inHouseProductionCostPaise),
        externalSourcingPayable: fromPaise(externalSourcingPayablePaise),
        movements: {
          purchaseUnits,
          productionUnits,
          saleUnits,
          damageUnits,
          returnUnits,
          adjustmentUnits,
        },
        totalInventoryValuation: fromPaise(totalInventoryValuationPaise),
        valuationList: inventoryValuationList,
      },
      receivables: {
        cumulativeInvoicedAsOfDate: fromPaise(cumulativeInvoicedAsOfDatePaise),
        cumulativePaymentsAsOfDate: fromPaise(cumulativePaymentsAsOfDatePaise),
        customerOutstandingAsOfDate: fromPaise(customerOutstandingAsOfDatePaise),
      },
    });
  } catch (error: any) {
    console.error("Failed to generate financial report:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate report" },
      { status: 500 }
    );
  }
}

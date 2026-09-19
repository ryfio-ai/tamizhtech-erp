import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getProductInventoryStateAsOf } from "@/lib/costService";
import { fromPaise } from "@/lib/money";

export const dynamic = "force-dynamic";

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
    // PILLAR 1: SALES & REVENUE (Accrual Basis in Period)
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
    let finishedProductSalesQty = 0;

    for (const inv of issuedInvoicesInPeriod) {
      grossInvoicedTotalPaise += inv.total;
      taxOnIssuedInvoicesPaise += inv.gstAmount;
      discountsGivenPaise += inv.discountAmount;

      for (const item of inv.items) {
        const itemType = item.product?.type || "FINISHED_PRODUCT";
        if (itemType === "SERVICE") {
          serviceSalesInvoicedPaise += item.amount;
        } else {
          productSalesInvoicedPaise += item.amount;
          finishedProductSalesQty += Math.round(item.qty ?? 1);
        }
      }
    }

    // Cost of Goods Sold (COGS) in period from SALE stock movements
    const saleMovementsInPeriod = await prisma.stockLedgerEntry.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        type: "SALE",
      },
    });

    const cogsPaise = saleMovementsInPeriod.reduce((sum, m) => sum + (m.costAmount || 0), 0);

    // ─────────────────────────────────────────────────────────────
    // PILLAR 2: CASH FLOW (Actual Liquidity via Payment Event Ledgers)
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

    // 2. Inventory Sourcing Payments in period (net of reversals)
    const sourcingPaymentsInPeriod = await prisma.inventorySourcingPayment.findMany({
      where: {
        paymentDate: { gte: startDate, lte: endDate },
      },
    });

    let inventoryCashOutflowPaise = 0;
    for (const sp of sourcingPaymentsInPeriod) {
      const amt = sp.amountPaise ?? sp.amount ?? 0;
      if (sp.direction === "DECREASE" || sp.type === "REVERSAL") {
        inventoryCashOutflowPaise -= amt;
      } else {
        inventoryCashOutflowPaise += amt;
      }
    }

    // 3. Operating Expense Payments Made in period (net of reversals)
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

    let operatingCashOutflowPaise = 0;
    const expensesByCategory: Record<string, number> = {};
    for (const ep of expensePaymentsInPeriod) {
      const amt = ep.amountPaise ?? ep.amount ?? 0;
      const isDecrease = ep.direction === "DECREASE" || ep.type === "REVERSAL";
      const signedAmt = isDecrease ? -amt : amt;
      operatingCashOutflowPaise += signedAmt;

      const cat = ep.expense.category || "OTHER";
      expensesByCategory[cat] = fromPaise(((expensesByCategory[cat] || 0) * 100) + signedAmt);
    }

    const totalCashOutflowPaise = inventoryCashOutflowPaise + operatingCashOutflowPaise;
    const netCashMovementPaise = customerCashInflowPaise - totalCashOutflowPaise;

    // ─────────────────────────────────────────────────────────────
    // PILLAR 3: INVENTORY SOURCING, PRODUCTION & CONSUMPTION
    // ─────────────────────────────────────────────────────────────
    // 1. External Material Procurement (Active Sourcing Records)
    const sourcingsInPeriod = await prisma.inventorySourcing.findMany({
      where: {
        purchaseDate: { gte: startDate, lte: endDate },
        status: "ACTIVE",
      },
      include: {
        product: { select: { type: true } },
        payments: true,
      },
    });

    let totalProcurementCostPaise = 0;
    let onlineSourcingCostPaise = 0;
    let offlineSourcingCostPaise = 0;
    let rawMaterialProcurementPaise = 0;
    let componentProcurementPaise = 0;
    let consumableProcurementPaise = 0;
    let externalSourcingPayablePaise = 0;

    for (const src of sourcingsInPeriod) {
      const totalCost = src.totalCostPaise ?? src.totalCost;
      totalProcurementCostPaise += totalCost;

      if (src.sourceType === "ONLINE") {
        onlineSourcingCostPaise += totalCost;
      } else if (src.sourceType === "OFFLINE") {
        offlineSourcingCostPaise += totalCost;
      }

      const pType = src.product.type;
      if (pType === "RAW_MATERIAL") {
        rawMaterialProcurementPaise += totalCost;
      } else if (pType === "COMPONENT") {
        componentProcurementPaise += totalCost;
      } else if (pType === "CONSUMABLE") {
        consumableProcurementPaise += totalCost;
      }

      const netPaid = src.payments.reduce((sum, p) => {
        const amt = p.amountPaise ?? p.amount ?? 0;
        return (p.direction === "DECREASE" || p.type === "REVERSAL") ? sum - amt : sum + amt;
      }, 0);

      externalSourcingPayablePaise += Math.max(0, totalCost - netPaid);
    }

    // 2. In-House Production in Period
    const productionsInPeriod = await prisma.productionRecord.findMany({
      where: {
        productionDate: { gte: startDate, lte: endDate },
        status: "COMPLETED",
      },
    });

    let productionUnitsTotal = 0;
    let productionMaterialCostPaise = 0;
    let productionDirectCostPaise = 0;
    let totalProductionOutputCostPaise = 0;

    for (const pr of productionsInPeriod) {
      productionUnitsTotal += pr.quantityProduced;
      productionMaterialCostPaise += pr.materialCostPaise ?? pr.materialCost;
      productionDirectCostPaise += pr.directCostPaise ?? pr.directCost;
      totalProductionOutputCostPaise += pr.totalProductionCostPaise ?? pr.totalProductionCost;
    }

    // 3. Material Consumption in Period
    const consumptionMovementsInPeriod = await prisma.stockLedgerEntry.findMany({
      where: {
        effectiveAt: { gte: startDate, lte: endDate },
        type: "PRODUCTION_CONSUMPTION",
      },
    });

    const materialConsumptionUnits = consumptionMovementsInPeriod.reduce((sum, m) => sum + Math.abs(m.quantitySigned), 0);
    const materialConsumptionCostPaise = consumptionMovementsInPeriod.reduce(
      (sum, m) => sum + (m.costAmountPaise ?? m.costAmount ?? 0),
      0
    );

    // 4. Physical Stock Movements Summary
    const movementsInPeriod = await prisma.stockLedgerEntry.findMany({
      where: {
        effectiveAt: { gte: startDate, lte: endDate },
      },
    });

    let purchaseUnits = 0;
    let productionUnits = 0;
    let consumptionUnits = 0;
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
        case "PRODUCTION_CONSUMPTION":
          consumptionUnits += qty;
          break;
        case "SALE":
          saleUnits += qty;
          break;
        case "DAMAGE":
          damageUnits += qty;
          break;
        case "RETURN":
        case "CUSTOMER_RETURN":
        case "PRODUCTION_CONSUMPTION_REVERSAL":
          returnUnits += qty;
          break;
        case "ADJUSTMENT":
          adjustmentUnits += mov.quantitySigned;
          break;
      }
    }

    // 5. Point-in-Time Inventory Valuation by Classification as of asOfDate
    const physicalProducts = await prisma.product.findMany({
      where: {
        type: { not: "SERVICE" },
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        sku: true,
        type: true,
        category: true,
      },
    });

    let totalInventoryValuationPaise = 0;
    const inventoryValuationList = [];

    const categorySummary = {
      rawMaterials: { count: 0, units: 0, valuationPaise: 0 },
      components: { count: 0, units: 0, valuationPaise: 0 },
      finishedProducts: { count: 0, units: 0, valuationPaise: 0 },
      consumables: { count: 0, units: 0, valuationPaise: 0 },
    };

    for (const prod of physicalProducts) {
      const state = await getProductInventoryStateAsOf(prod.id, asOfDate);
      totalInventoryValuationPaise += state.valuationPaise;

      const pType = prod.type;
      if (pType === "RAW_MATERIAL") {
        categorySummary.rawMaterials.count++;
        categorySummary.rawMaterials.units += state.closingQty;
        categorySummary.rawMaterials.valuationPaise += state.valuationPaise;
      } else if (pType === "COMPONENT") {
        categorySummary.components.count++;
        categorySummary.components.units += state.closingQty;
        categorySummary.components.valuationPaise += state.valuationPaise;
      } else if (pType === "CONSUMABLE") {
        categorySummary.consumables.count++;
        categorySummary.consumables.units += state.closingQty;
        categorySummary.consumables.valuationPaise += state.valuationPaise;
      } else {
        // FINISHED_PRODUCT or legacy PHYSICAL_PRODUCT
        categorySummary.finishedProducts.count++;
        categorySummary.finishedProducts.units += state.closingQty;
        categorySummary.finishedProducts.valuationPaise += state.valuationPaise;
      }

      inventoryValuationList.push({
        id: prod.id,
        name: prod.name,
        sku: prod.sku,
        type: prod.type,
        category: prod.category || "General",
        stockQuantity: state.closingQty,
        rollingWAC: state.rollingWACRupees,
        valuation: state.valuationRupees,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // PILLAR 4: RECEIVABLES AS OF AS_OF_DATE
    // ─────────────────────────────────────────────────────────────
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
      if (inv.status === "CANCELLED" && inv.cancelledAt && inv.cancelledAt <= asOfDate) {
        continue;
      }
      cumulativeInvoicedAsOfDatePaise += inv.total;
    }

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
        taxOnIssuedInvoices: fromPaise(taxOnIssuedInvoicesPaise),
        discountsGiven: fromPaise(discountsGivenPaise),
        grossInvoicedTotal: fromPaise(grossInvoicedTotalPaise),
        finishedProductUnitsSold: finishedProductSalesQty,
        cogs: fromPaise(cogsPaise),
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
      procurement: {
        totalProcurementCost: fromPaise(totalProcurementCostPaise),
        onlineSourcingCost: fromPaise(onlineSourcingCostPaise),
        offlineSourcingCost: fromPaise(offlineSourcingCostPaise),
        rawMaterialProcurement: fromPaise(rawMaterialProcurementPaise),
        componentProcurement: fromPaise(componentProcurementPaise),
        consumableProcurement: fromPaise(consumableProcurementPaise),
        externalSourcingPayable: fromPaise(externalSourcingPayablePaise),
      },
      production: {
        productionBatchesCount: productionsInPeriod.length,
        unitsProduced: productionUnitsTotal,
        materialCost: fromPaise(productionMaterialCostPaise),
        directCost: fromPaise(productionDirectCostPaise),
        totalProductionCost: fromPaise(totalProductionOutputCostPaise),
        materialUnitsConsumed: materialConsumptionUnits,
        materialConsumptionCost: fromPaise(materialConsumptionCostPaise),
      },
      inventory: {
        totalInventoryValuation: fromPaise(totalInventoryValuationPaise),
        closingInventory: {
          rawMaterials: {
            itemCount: categorySummary.rawMaterials.count,
            units: categorySummary.rawMaterials.units,
            valuation: fromPaise(categorySummary.rawMaterials.valuationPaise),
          },
          components: {
            itemCount: categorySummary.components.count,
            units: categorySummary.components.units,
            valuation: fromPaise(categorySummary.components.valuationPaise),
          },
          finishedProducts: {
            itemCount: categorySummary.finishedProducts.count,
            units: categorySummary.finishedProducts.units,
            valuation: fromPaise(categorySummary.finishedProducts.valuationPaise),
          },
          consumables: {
            itemCount: categorySummary.consumables.count,
            units: categorySummary.consumables.units,
            valuation: fromPaise(categorySummary.consumables.valuationPaise),
          },
        },
        movements: {
          purchaseUnits,
          productionUnits,
          consumptionUnits,
          saleUnits,
          damageUnits,
          returnUnits,
          adjustmentUnits,
        },
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

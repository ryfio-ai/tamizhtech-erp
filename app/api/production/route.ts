import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { executeProductionBatch } from "@/lib/productionService";
import { fromPaise } from "@/lib/money";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const finishedProductId = searchParams.get("finishedProductId");
    const status = searchParams.get("status");
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

    const where: any = {};
    if (finishedProductId) where.finishedProductId = finishedProductId;
    if (status) where.status = status;

    const [total, records] = await Promise.all([
      prisma.productionRecord.count({ where }),
      prisma.productionRecord.findMany({
        where,
        include: {
          finishedProduct: {
            select: { id: true, name: true, sku: true, stockQuantity: true, category: true },
          },
          items: {
            include: {
              inputProduct: {
                select: { id: true, name: true, sku: true, stockQuantity: true, category: true, type: true },
              },
            },
          },
          createdBy: {
            select: { name: true, email: true },
          },
        },
        orderBy: { productionDate: "desc" },
        take: limit,
        skip: offset,
      }),
    ]);

    const formatted = records.map((r) => ({
      ...r,
      materialCostRupees: fromPaise(r.materialCost),
      directCostRupees: fromPaise(r.directCost),
      totalProductionCostRupees: fromPaise(r.totalProductionCost),
      unitProductionCostRupees: fromPaise(r.unitProductionCost),
      items: r.items.map((it) => ({
        ...it,
        unitCostRupees: fromPaise(it.unitCost),
        totalCostRupees: fromPaise(it.totalCost),
      })),
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
      pagination: { total, limit, offset },
    });
  } catch (error: any) {
    console.error("GET Production Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch production records" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      finishedProductId,
      quantityProduced,
      directCost = 0,
      components,
      productionDate,
      idempotencyKey,
      notes,
      userId,
    } = body;

    if (!finishedProductId) {
      return NextResponse.json(
        { success: false, error: "Finished product ID is required." },
        { status: 400 }
      );
    }

    if (!components || !Array.isArray(components) || components.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one input component is required." },
        { status: 400 }
      );
    }

    const production = await executeProductionBatch({
      finishedProductId,
      quantityProduced: Number(quantityProduced),
      directCost: Number(directCost) || 0,
      components: components.map((c: any) => ({
        productId: c.productId,
        quantity: Number(c.quantity),
        notes: c.notes,
      })),
      productionDate,
      idempotencyKey,
      notes,
      userId,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...production,
        materialCostRupees: production ? fromPaise(production.materialCost) : 0,
        directCostRupees: production ? fromPaise(production.directCost) : 0,
        totalProductionCostRupees: production ? fromPaise(production.totalProductionCost) : 0,
        unitProductionCostRupees: production ? fromPaise(production.unitProductionCost) : 0,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST Production Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute production batch" },
      { status: 400 }
    );
  }
}

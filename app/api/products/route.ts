import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createProductWithStock, ProductClassificationType } from "@/lib/stockService";
import { getProductRollingWACPaise } from "@/lib/costService";
import { fromPaise, safeMultiplyQuantityByPaise } from "@/lib/money";
import { z } from "zod";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const typeParam = searchParams.get("type");
    const category = searchParams.get("category");
    const saleableOnly = searchParams.get("saleable") === "true";
    const search = searchParams.get("search")?.trim();
    const includeValuation = searchParams.get("includeValuation") === "true";

    const where: any = {};

    if (typeParam) {
      const types = typeParam.split(",").map((t) => t.trim());
      // Handle legacy PHYSICAL_PRODUCT equivalence with FINISHED_PRODUCT
      if (types.includes("FINISHED_PRODUCT")) {
        types.push("PHYSICAL_PRODUCT");
      }
      where.type = { in: types };
    }

    if (saleableOnly) {
      where.isSaleable = true;
    }

    if (category && category !== "ALL") {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { stockLedgerEntries: true },
        },
      },
    });

    let formatted = products;

    if (includeValuation) {
      formatted = await Promise.all(
        products.map(async (prod) => {
          if (prod.type === "SERVICE") {
            return {
              ...prod,
              rollingWACRupees: 0,
              valuationRupees: 0,
            };
          }
          const wacPaise = await getProductRollingWACPaise(prod.id);
          const valuationPaise = safeMultiplyQuantityByPaise(prod.stockQuantity || 0, wacPaise);
          return {
            ...prod,
            rollingWACRupees: fromPaise(wacPaise),
            valuationRupees: fromPaise(valuationPaise),
          };
        })
      );
    }

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error("GET Products Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.name || typeof body.name !== "string" || body.name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Product name is required (min 2 characters)" },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "RAW_MATERIAL",
      "COMPONENT",
      "FINISHED_PRODUCT",
      "CONSUMABLE",
      "SERVICE",
      "PHYSICAL_PRODUCT",
    ];
    const rawType = body.type ? String(body.type).trim() : "FINISHED_PRODUCT";
    const productType: ProductClassificationType = allowedTypes.includes(rawType)
      ? (rawType as ProductClassificationType)
      : "FINISHED_PRODUCT";

    const pricingMode =
      body.pricingMode === "REQUIREMENT_BASED" ||
      body.basePrice === null ||
      body.basePrice === undefined ||
      body.basePrice === ""
        ? "REQUIREMENT_BASED"
        : "FIXED";

    let price: number | null = null;
    if (pricingMode === "FIXED") {
      const parsedPrice = Number(body.basePrice);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return NextResponse.json(
          { success: false, error: "Valid selling price is required for fixed-price products" },
          { status: 400 }
        );
      }
      price = parsedPrice;
    }

    // Auto-generate deterministic SKU and write OPENING stock entry if stock > 0
    const newProduct = await createProductWithStock({
      name: body.name.trim(),
      category: body.category || "General",
      basePrice: price,
      pricingMode,
      taxRate: Number(body.taxRate) || 18,
      type: productType,
      isSaleable: body.isSaleable !== undefined ? Boolean(body.isSaleable) : undefined,
      quantityScale: Number(body.quantityScale) || 1,
      initialStock: productType !== "SERVICE" ? Number(body.initialStock ?? body.stockQuantity ?? 0) : 0,
      description: body.description || null,
      configurationNotes: body.configurationNotes || null,
      status: body.status || "ACTIVE",
    });

    return NextResponse.json({ success: true, data: newProduct }, { status: 201 });
  } catch (error: any) {
    console.error("POST Product Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

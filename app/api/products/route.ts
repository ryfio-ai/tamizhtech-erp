import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createProductWithStock } from "@/lib/stockService";
import { z } from "zod";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { stockLedgerEntries: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: products });
  } catch (error: any) {
    console.error("GET Products Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.name || typeof body.name !== "string" || body.name.trim().length < 2) {
      return NextResponse.json({ success: false, error: "Product name is required (min 2 characters)" }, { status: 400 });
    }

    const productType = body.type === "SERVICE" ? "SERVICE" : "PHYSICAL_PRODUCT";
    const pricingMode = body.pricingMode === "REQUIREMENT_BASED" || body.basePrice === null || body.basePrice === undefined || body.basePrice === ""
      ? "REQUIREMENT_BASED"
      : "FIXED";

    let price: number | null = null;
    if (pricingMode === "FIXED") {
      const parsedPrice = Number(body.basePrice);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return NextResponse.json({ success: false, error: "Valid selling price is required for fixed-price products" }, { status: 400 });
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
      initialStock: productType === "PHYSICAL_PRODUCT" ? Number(body.initialStock ?? body.stockQuantity ?? 0) : 0,
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

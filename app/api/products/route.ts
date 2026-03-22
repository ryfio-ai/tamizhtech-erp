import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { productSchema } from "@/lib/validations";
import { z } from "zod";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' }
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
    const validated = productSchema.parse(body);

    const newProduct = await prisma.product.create({
      data: {
        name: validated.name,
        description: validated.description,
        type: validated.type || "PHYSICAL",
        status: validated.status || "ACTIVE",
        basePrice: validated.basePrice,
        taxRate: validated.taxRate || 18,
        stockQuantity: validated.stockQuantity || 0
      }
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

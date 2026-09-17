import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizeProductName } from "@/lib/productUtils";

// GET /api/products/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        stockLedgerEntries: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { createdBy: { select: { name: true, email: true } } },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error: any) {
    console.error("Fetch product error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH /api/products/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const existing = await prisma.product.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const {
      name,
      category,
      description,
      minStock,
      basePrice,
      pricingMode,
      configurationNotes,
      status,
    } = body;

    const dataToUpdate: any = {};

    if (name !== undefined) {
      dataToUpdate.name = name.trim();
      dataToUpdate.normalizedName = normalizeProductName(name.trim());
    }

    if (category !== undefined) dataToUpdate.category = category;
    if (description !== undefined) dataToUpdate.description = description ? description.trim() : null;
    if (minStock !== undefined) dataToUpdate.minStock = parseInt(minStock) || 0;
    if (configurationNotes !== undefined) dataToUpdate.configurationNotes = configurationNotes ? configurationNotes.trim() : null;
    if (status !== undefined) dataToUpdate.status = status;

    if (pricingMode !== undefined) {
      dataToUpdate.pricingMode = pricingMode;
      if (pricingMode === "REQUIREMENT_BASED") {
        dataToUpdate.basePrice = null;
      } else if (basePrice !== undefined) {
        dataToUpdate.basePrice = parseFloat(basePrice) || 0;
      }
    } else if (basePrice !== undefined) {
      dataToUpdate.basePrice = existing.pricingMode === "REQUIREMENT_BASED" ? null : (parseFloat(basePrice) || 0);
    }

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Update product error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/products/[id] - Safe Archive / Soft Delete
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        invoiceItems: { select: { id: true } },
        stockLedgerEntries: { select: { id: true } },
      },
    });

    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const hasInvoices = product.invoiceItems.length > 0;
    const hasLedger = product.stockLedgerEntries.length > 0;

    // If product has accounting or ledger history, soft-archive it to protect integrity
    if (hasInvoices || hasLedger) {
      const archived = await prisma.product.update({
        where: { id: params.id },
        data: { status: "ARCHIVED" },
      });
      return NextResponse.json({
        success: true,
        data: archived,
        message: "Product archived successfully. Historical invoices and ledger entries preserved.",
      });
    }

    // Otherwise, safe to permanently delete
    await prisma.product.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, data: null, message: "Product deleted successfully" });
  } catch (error: any) {
    console.error("Delete product error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

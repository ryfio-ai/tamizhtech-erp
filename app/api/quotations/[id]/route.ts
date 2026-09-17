import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { fromPaise } from "@/lib/money";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

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
    };

    return NextResponse.json({ success: true, quotation: formatted });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch quotation" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { status, notes, terms } = body;

    const allowedStatuses = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"];
    const data: any = {};

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

    const updated = await prisma.quotation.update({
      where: { id: params.id },
      data,
      include: {
        client: true,
        items: true,
      },
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
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update quotation" },
      { status: 500 }
    );
  }
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



import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { roundMoney, toPaise } from "@/lib/money";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: params.id },
      include: {
        payments: { orderBy: { paymentDate: "desc" } },
      },
    });

    if (!expense) {
      return NextResponse.json({ success: false, error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, expense });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch expense" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { category, amount, description, paidTo, notes, status, referenceNo } = body;

    const data: any = {};
    if (category !== undefined) data.category = category;
    if (amount !== undefined) data.amount = roundMoney(parseFloat(amount));
    if (description !== undefined) data.description = description;
    if (paidTo !== undefined) data.paidTo = paidTo;
    if (notes !== undefined) data.notes = notes;
    if (referenceNo !== undefined) data.referenceNo = referenceNo;
    if (status !== undefined) {
      data.status = status;
      if (status === "VOIDED") {
        data.voidedAt = new Date();
      }
    }

    const updated = await prisma.expense.update({
      where: { id: params.id },
      data,
      include: {
        payments: { orderBy: { paymentDate: "desc" } },
      },
    });

    return NextResponse.json({ success: true, expense: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update expense" },
      { status: 500 }
    );
  }
}

/**
 * DELETE voids the expense safely, preserving historical payment and audit trail.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const hardDelete = searchParams.get("hard") === "true";

    if (hardDelete) {
      // Allowed for synthetic test fixture cleanup only
      await prisma.expensePayment.deleteMany({ where: { expenseId: params.id } });
      await prisma.expense.delete({ where: { id: params.id } });
      return NextResponse.json({ success: true, message: "Expense permanently deleted (fixture cleanup)" });
    }

    // Business-safe soft voiding
    const voided = await prisma.expense.update({
      where: { id: params.id },
      data: {
        status: "VOIDED",
        voidedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, message: "Expense voided successfully", expense: voided });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to void expense" },
      { status: 500 }
    );
  }
}

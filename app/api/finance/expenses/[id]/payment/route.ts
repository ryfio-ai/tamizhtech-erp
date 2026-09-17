import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { roundMoney, safeAdd, toPaise, fromPaise } from "@/lib/money";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const expenseId = params.id;
    const body = await req.json();
    const { amount, paymentDate, paymentMethod = "BANK_TRANSFER", paymentReference, notes, createdById } = body;

    const paymentAmountPaise = toPaise(roundMoney(parseFloat(amount)));
    if (isNaN(paymentAmountPaise) || paymentAmountPaise <= 0) {
      return NextResponse.json(
        { success: false, error: "Payment amount must be greater than 0" },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: { payments: true },
    });

    if (!expense) {
      return NextResponse.json({ success: false, error: "Expense not found" }, { status: 404 });
    }

    if (expense.status === "VOIDED") {
      return NextResponse.json(
        { success: false, error: "Cannot record payments against a VOIDED expense" },
        { status: 400 }
      );
    }

    const currentPaidPaise = expense.payments.reduce((acc, p) => acc + p.amount, 0);
    const newTotalPaidPaise = currentPaidPaise + paymentAmountPaise;

    if (newTotalPaidPaise > expense.amount) {
      return NextResponse.json(
        {
          success: false,
          error: `Payment exceeds expense amount. Remaining unpaid balance is ₹${fromPaise(expense.amount - currentPaidPaise)}`,
        },
        { status: 400 }
      );
    }

    const effectiveDate = paymentDate ? new Date(paymentDate) : new Date();

    // Append payment ledger event
    const payment = await prisma.expensePayment.create({
      data: {
        expenseId,
        amount: paymentAmountPaise,
        paymentDate: effectiveDate,
        paymentMethod,
        paymentReference: paymentReference || null,
        notes: notes || null,
        createdById: createdById || null,
      },
    });

    // Update parent projections
    const updatedStatus = newTotalPaidPaise >= expense.amount ? "PAID" : "PARTIAL";
    const updatedExpense = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        paidAmount: newTotalPaidPaise,
        paymentStatus: updatedStatus,
        paidAt: effectiveDate,
        paymentMethod,
      },

      include: {
        payments: { orderBy: { paymentDate: "desc" } },
      },
    });

    const formattedPayment = {
      ...payment,
      amount: fromPaise(payment.amount),
    };

    const formattedExpense = {
      ...updatedExpense,
      amount: fromPaise(updatedExpense.amount),
      paidAmount: fromPaise(updatedExpense.paidAmount),
      payments: updatedExpense.payments.map((p) => ({
        ...p,
        amount: fromPaise(p.amount),
      })),
    };

    return NextResponse.json({
      success: true,
      payment: formattedPayment,
      expense: formattedExpense,
    });
  } catch (error: any) {
    console.error("Failed to record expense payment:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to record payment" },
      { status: 500 }
    );
  }
}

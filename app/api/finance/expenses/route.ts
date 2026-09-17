import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateExpenseNo } from "@/lib/sequence";
import { roundMoney, toPaise, fromPaise } from "@/lib/money";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");

    const where: any = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        payments: {
          orderBy: { paymentDate: "desc" },
        },
      },
      orderBy: { date: "desc" },
    });

    const formatted = expenses.map((exp) => ({
      ...exp,
      amount: fromPaise(exp.amount),
      paidAmount: fromPaise(exp.paidAmount),
      payments: exp.payments.map((p) => ({
        ...p,
        amount: fromPaise(p.amount),
      })),
    }));

    return NextResponse.json({ success: true, expenses: formatted });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      category,
      amount,
      date,
      description,
      paidTo,
      notes,
      referenceNo,
      initialPaidAmount = 0,
      paymentMethod = "BANK_TRANSFER",
      createdById,
    } = body;

    if (!category) {
      return NextResponse.json({ success: false, error: "Category is required" }, { status: 400 });
    }

    const cleanAmount = roundMoney(parseFloat(amount));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      return NextResponse.json({ success: false, error: "Amount must be greater than 0" }, { status: 400 });
    }
    const cleanAmountPaise = toPaise(cleanAmount);

    const expenseNo = await generateExpenseNo();
    const incurredDate = date ? new Date(date) : new Date();

    const initialPaidPaise = toPaise(parseFloat(initialPaidAmount) || 0);
    const cleanPaidPaise = Math.min(Math.max(0, initialPaidPaise), cleanAmountPaise);
    let paymentStatus: "UNPAID" | "PARTIAL" | "PAID" = "UNPAID";
    if (cleanPaidPaise >= cleanAmountPaise && cleanAmountPaise > 0) {
      paymentStatus = "PAID";
    } else if (cleanPaidPaise > 0) {
      paymentStatus = "PARTIAL";
    }

    const paidAt = cleanPaidPaise > 0 ? incurredDate : null;

    const expense = await prisma.expense.create({
      data: {
        expenseNo,
        category,
        amount: cleanAmountPaise,
        paidAmount: cleanPaidPaise,
        date: incurredDate,
        paidAt,
        description: description || null,
        paidTo: paidTo || null,
        status: "APPROVED",
        paymentStatus,
        paymentMethod: cleanPaidPaise > 0 ? paymentMethod : null,
        referenceNo: referenceNo || null,
        notes: notes || null,
        createdById: createdById || null,
      },
    });

    if (cleanPaidPaise > 0) {
      await prisma.expensePayment.create({
        data: {
          expenseId: expense.id,
          amount: cleanPaidPaise,
          paymentDate: incurredDate,
          paymentMethod,

          paymentReference: referenceNo || null,
          notes: "Initial expense payment",
          createdById: createdById || null,
        },
      });
    }

    const fullExpense = await prisma.expense.findUnique({
      where: { id: expense.id },
      include: { payments: true },
    });

    const formatted = fullExpense
      ? {
          ...fullExpense,
          amount: fromPaise(fullExpense.amount),
          paidAmount: fromPaise(fullExpense.paidAmount),
          payments: fullExpense.payments.map((p) => ({
            ...p,
            amount: fromPaise(p.amount),
          })),
        }
      : expense;

    return NextResponse.json({ success: true, expense: formatted });
  } catch (error: any) {
    console.error("Failed to create expense:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create expense" },
      { status: 500 }
    );
  }
}

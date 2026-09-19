import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { roundMoney, safeAdd, toPaise, fromPaise } from "@/lib/money";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sourcingId = params.id;
    const body = await req.json();
    const { amount, paymentDate, paymentMethod = "BANK_TRANSFER", paymentReference, notes, createdById } = body;

    const paymentAmountPaise = toPaise(roundMoney(parseFloat(amount)));
    if (isNaN(paymentAmountPaise) || paymentAmountPaise <= 0) {
      return NextResponse.json(
        { success: false, error: "Payment amount must be greater than 0" },
        { status: 400 }
      );
    }

    const sourcing = await prisma.inventorySourcing.findUnique({
      where: { id: sourcingId },
      include: { payments: true },
    });

    if (!sourcing) {
      return NextResponse.json({ success: false, error: "Sourcing record not found" }, { status: 404 });
    }

    const currentPaidPaise = sourcing.payments.reduce((acc, p) => {
      const amt = p.amountPaise ?? p.amount ?? 0;
      return (p.direction === "DECREASE" || p.type === "REVERSAL") ? acc - amt : acc + amt;
    }, 0);
    const newTotalPaidPaise = currentPaidPaise + paymentAmountPaise;

    const totalCostPaise = sourcing.totalCostPaise ?? sourcing.totalCost;
    if (newTotalPaidPaise > totalCostPaise) {
      return NextResponse.json(
        {
          success: false,
          error: `Payment exceeds total cost. Remaining balance is ₹${fromPaise(totalCostPaise - currentPaidPaise)}`,
        },
        { status: 400 }
      );
    }

    const effectiveDate = paymentDate ? new Date(paymentDate) : new Date();

    // Append payment ledger event
    const payment = await prisma.inventorySourcingPayment.create({
      data: {
        sourcingId,
        amountPaise: paymentAmountPaise,
        amount: paymentAmountPaise,
        direction: "INCREASE",
        type: "PAYMENT",
        paymentDate: effectiveDate,
        paymentMethod,
        paymentReference: paymentReference || null,
        notes: notes || null,
        createdById: createdById || null,
      },
    });

    // Update parent projections
    const updatedStatus = newTotalPaidPaise >= totalCostPaise ? "PAID" : "PARTIAL";
    const updatedSourcing = await prisma.inventorySourcing.update({
      where: { id: sourcingId },
      data: {
        paidAmountPaise: newTotalPaidPaise,
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

    const formattedSourcing = {
      ...updatedSourcing,
      unitCost: fromPaise(updatedSourcing.unitCost),
      totalCost: fromPaise(updatedSourcing.totalCost),
      paidAmount: fromPaise(updatedSourcing.paidAmount),
      payments: updatedSourcing.payments.map((p) => ({
        ...p,
        amount: fromPaise(p.amount),
      })),
    };

    return NextResponse.json({
      success: true,
      payment: formattedPayment,
      sourcing: formattedSourcing,
    });
  } catch (error: any) {
    console.error("Failed to record sourcing payment:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to record payment" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// PATCH /api/payments/[id] - Reverse Payment (Compensating Ledger Movement)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { action, reason } = body;

    const payment = await prisma.payment.findUnique({ where: { id: params.id } });
    if (!payment) {
      return NextResponse.json({ success: false, error: "Payment not found" }, { status: 404 });
    }

    if (payment.status === "REVERSED") {
      return NextResponse.json({ success: false, error: "Payment is already reversed" }, { status: 400 });
    }

    if (action === "REVERSE") {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Mark payment as REVERSED
        const updatedPayment = await tx.payment.update({
          where: { id: params.id },
          data: {
            status: "REVERSED",
            type: "REVERSAL",
            notes: payment.notes
              ? `${payment.notes} | REVERSED: ${reason || "Reversed by user"}`
              : `REVERSED: ${reason || "Reversed by user"}`,
          },
        });

        // 2. Adjust invoice financial balance if linked to an invoice
        if (payment.invoiceId) {
          const invoice = await tx.invoice.findUnique({ where: { id: payment.invoiceId } });
          if (invoice) {
            const newPaidAmount = Math.max(0, invoice.paidAmount - payment.amount);
            const newBalance = invoice.total - newPaidAmount;
            let newStatus = "PARTIALLY_PAID";
            if (newBalance <= 0) newStatus = "PAID";
            if (newPaidAmount <= 0) newStatus = "ISSUED";

            await tx.invoice.update({
              where: { id: invoice.id },
              data: {
                paidAmount: newPaidAmount,
                balance: newBalance,
                status: newStatus as any,
              },
            });
          }
        }

        return updatedPayment;
      });

      return NextResponse.json({
        success: true,
        data: result,
        message: "Payment reversed successfully. Invoice balance restored.",
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Payment reversal error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/payments/[id] - Safe Reversal alternative (preserves ledger)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: params.id } });
    if (!payment) {
      return NextResponse.json({ success: false, error: "Payment not found" }, { status: 404 });
    }

    if (payment.status === "REVERSED") {
      return NextResponse.json({ success: false, error: "Payment is already reversed" }, { status: 400 });
    }

    // Instead of deleting historical records, execute compensating reversal
    const result = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: params.id },
        data: {
          status: "REVERSED",
          type: "REVERSAL",
          notes: payment.notes ? `${payment.notes} | REVERSED` : "REVERSED",
        },
      });

      if (payment.invoiceId) {
        const invoice = await tx.invoice.findUnique({ where: { id: payment.invoiceId } });
        if (invoice) {
          const newPaidAmount = Math.max(0, invoice.paidAmount - payment.amount);
          const newBalance = invoice.total - newPaidAmount;
          let newStatus = "PARTIALLY_PAID";
          if (newBalance <= 0) newStatus = "PAID";
          if (newPaidAmount <= 0) newStatus = "ISSUED";

          await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              paidAmount: newPaidAmount,
              balance: newBalance,
              status: newStatus as any,
            },
          });
        }
      }

      return updatedPayment;
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: "Payment reversed successfully without corrupting ledger history.",
    });
  } catch (error: any) {
    console.error("Payment delete error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

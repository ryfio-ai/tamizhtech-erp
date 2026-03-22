import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: params.id } });
    if (!payment) throw new Error("Payment not found");

    const invoice = await prisma.invoice.findUnique({ where: { id: payment.invoiceId } });
    if (!invoice) throw new Error("Associated invoice not found");

    // Transaction to reverse the invoice status & delete payment
    await prisma.$transaction(async (tx) => {
      // Revert invoice
      const newPaidAmount = Math.max(0, invoice.paidAmount - payment.amount);
      const newBalance = invoice.total - newPaidAmount;
      let newStatus = "Partial";
      if (newBalance <= 0) newStatus = "Paid";
      if (newPaidAmount <= 0) newStatus = "Unpaid";

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          balance: newBalance,
          paymentStatus: newStatus
        }
      });

      // Delete payment
      await tx.payment.delete({ where: { id: params.id } });
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

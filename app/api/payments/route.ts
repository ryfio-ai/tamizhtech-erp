import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { CreatePaymentInput } from "@/types";
import { generateId } from "@/lib/utils";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const payments = await prisma.payment.findMany({
      include: { client: true, invoice: true },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = payments.map(p => ({
      ...p,
      clientName: p.client?.name || "N/A",
      invoiceNo: p.invoice?.invoiceNo || "N/A",
      createdAt: p.createdAt.toISOString()
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: CreatePaymentInput = await req.json();
    const newId = generateId();

    // Generate Payment ID (PAY-XXXXXX)
    const count = await prisma.payment.count();
    const paymentId = `PAY-${String(count + 1).padStart(6, '0')}`;

    // Validate Invoice
    const invoice = await prisma.invoice.findUnique({ where: { id: body.invoiceId } });
    if (!invoice) throw new Error("Invoice not found");

    if (body.amount > invoice.balance) {
      return NextResponse.json({ success: false, error: "Payment amount cannot exceed invoice balance" }, { status: 400 });
    }

    // Transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Payment
      const payment = await tx.payment.create({
        data: {
          id: newId,
          paymentNo: paymentId,
          invoiceId: invoice.id,
          clientId: invoice.clientId,
          amount: body.amount,
          date: body.date ? new Date(body.date) : new Date(),
          mode: body.mode,
          referenceNo: body.referenceNo || "",
          notes: body.notes || ""
        }
      });

      // 2. Update Invoice
      const newPaidAmount = invoice.paidAmount + body.amount;
      const newBalance = invoice.total - newPaidAmount;
      let newStatus = "Partial";
      if (newBalance <= 0) newStatus = "Paid";
      if (newPaidAmount === 0 && invoice.total > 0) newStatus = "Unpaid";

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          balance: newBalance,
          status: newStatus
        }
      });

      return payment;
    });

    // Fetch related names for UI
    const finalPayment = await prisma.payment.findUnique({
      where: { id: result.id },
      include: { client: true, invoice: true }
    });

    return NextResponse.json({ 
      success: true, 
      data: {
        ...finalPayment,
        clientName: finalPayment?.client?.name || "N/A",
        invoiceNo: finalPayment?.invoice?.invoiceNo || "N/A"
      }
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

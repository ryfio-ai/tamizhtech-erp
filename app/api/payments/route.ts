import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { CreatePaymentInput } from "@/types";
import { generatePaymentNo } from "@/lib/sequence";
import { toPaise, fromPaise } from "@/lib/money";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { BusinessDocumentPDFTemplate } from "@/components/shared/BusinessDocumentPDFTemplate";
import { getNormalizedInvoiceData } from "@/lib/businessDocumentData";
import { sendPaymentReceiptEmail } from "@/lib/mail";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const payments = await prisma.payment.findMany({
      include: { client: true, invoice: true },
      orderBy: { createdAt: "desc" },
    });

    const formatted = payments.map((p) => ({
      ...p,
      amount: fromPaise(p.amount),
      clientName: p.client?.name || "N/A",
      clientPhone: p.client?.phone || null,
      invoiceNo: p.invoice?.invoiceNo || "N/A",
      remainingBalance: p.invoice?.balance !== undefined ? fromPaise(p.invoice.balance) : 0,
      createdAt: p.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: CreatePaymentInput = await req.json();

    if (!body.invoiceId) {
      return NextResponse.json(
        { success: false, error: "Invoice is required" },
        { status: 400 }
      );
    }

    const amountInPaise = toPaise(Number(body.amount) || 0);
    if (amountInPaise <= 0) {
      return NextResponse.json(
        { success: false, error: "Payment amount must be greater than zero" },
        { status: 400 }
      );
    }

    // Validate Invoice
    const invoice = await prisma.invoice.findUnique({ where: { id: body.invoiceId } });
    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    if (amountInPaise > invoice.balance) {
      return NextResponse.json(
        {
          success: false,
          error: `Payment amount (₹${fromPaise(amountInPaise)}) cannot exceed invoice balance (₹${fromPaise(invoice.balance)})`,
        },
        { status: 400 }
      );
    }

    // Generate Payment Receipt No atomically from BusinessSequence
    const paymentId = await generatePaymentNo();

    // Transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Payment - do NOT provide id, let MongoDB auto-generate valid ObjectId
      const payment = await tx.payment.create({
        data: {
          paymentNo: paymentId,
          invoiceId: invoice.id,
          clientId: invoice.clientId,
          amount: amountInPaise,
          date: body.date ? new Date(body.date) : new Date(),
          mode: body.mode || "UPI",
          status: "COMPLETED",
          type: "PAYMENT",
          referenceNo: body.referenceNo || "",
          notes: body.notes || "",
        },
      });

      // 2. Update Invoice
      const newPaidAmount = invoice.paidAmount + amountInPaise;
      const newBalance = Math.max(0, invoice.total - newPaidAmount);
      let newStatus = "PARTIALLY_PAID";
      if (newBalance <= 0) newStatus = "PAID";
      if (newPaidAmount === 0 && invoice.total > 0) newStatus = "ISSUED";

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          balance: newBalance,
          status: newStatus as any,
        },
      });

      return payment;
    });

    // Fetch related names for UI
    const finalPayment = await prisma.payment.findUnique({
      where: { id: result.id },
      include: { client: true, invoice: true },
    });

    // Automated Thank You Email with Bill PDF on Payment Success
    let emailSent = false;
    let emailRecipient: string | null = null;
    try {
      const recipient = finalPayment?.client?.email?.trim();
      const targetEmail = recipient || "ryfioai@gmail.com";
      if (targetEmail && invoice.id) {
        emailRecipient = targetEmail;
        const normalizedData = await getNormalizedInvoiceData(invoice.id);
        if (normalizedData) {
          const pdfBuffer = await renderToBuffer(
            React.createElement(BusinessDocumentPDFTemplate, { data: normalizedData }) as any
          );
          await sendPaymentReceiptEmail({
            recipientEmail: targetEmail,
            clientName: finalPayment?.client?.name || invoice.clientName || "Valued Customer",
            amount: fromPaise(finalPayment?.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 }),
            paymentNo: finalPayment?.paymentNo || paymentId,
            invoiceNo: invoice.invoiceNo,
            paymentDate: new Date(finalPayment?.date || Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
            paymentMode: finalPayment?.mode || "UPI",
            referenceNo: finalPayment?.referenceNo || "",
            balance: `₹${fromPaise(Math.max(0, invoice.balance - amountInPaise)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
            pdfBuffer: Buffer.from(pdfBuffer),
          });
          emailSent = true;
        }
      }
    } catch (emailErr) {
      console.error("[Automated Payment Receipt Email Error]:", emailErr);
    }

    return NextResponse.json(
      {
        success: true,
        emailSent,
        emailRecipient,
        data: {
          ...finalPayment,
          amount: fromPaise(finalPayment?.amount || 0),
          clientName: finalPayment?.client?.name || "N/A",
          invoiceNo: finalPayment?.invoice?.invoiceNo || "N/A",
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

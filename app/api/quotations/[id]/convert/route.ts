import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { allocateInvoiceNoTx, generateDraftInvoiceNo } from "@/lib/sequence";
import { getSystemSetting } from "@/lib/settings";
import { roundMoney, safeAdd } from "@/lib/money";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const quotationId = params.id;
    const body = await req.json().catch(() => ({}));
    const { dueDate, status = "DRAFT" } = body;

    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        client: true,
        items: true,
      },
    });

    if (!quotation) {
      return NextResponse.json({ success: false, error: "Quotation not found" }, { status: 404 });
    }

    if (quotation.status === "CANCELLED" || quotation.status === "REJECTED") {
      return NextResponse.json(
        { success: false, error: `Cannot convert a ${quotation.status} quotation to an invoice` },
        { status: 400 }
      );
    }

    const targetStatus = status === "ISSUED" ? "ISSUED" : "DRAFT";
    const defaultGstRate = await getSystemSetting("DEFAULT_GST_RATE");
    const defaultInvoiceTerms = await getSystemSetting("DEFAULT_INVOICE_TERMS");
    const effectiveDueDate = dueDate
      ? new Date(dueDate)
      : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days default

    // Prepare InvoiceItems preserving agreed quoted rates and configuration notes
    const invoiceItems = quotation.items.map((item) => ({
      productId: item.productId,
      description: item.description || item.name || "Item",
      qty: item.qty,
      unitPrice: item.unitPrice,
      amount: item.amount,
      configurationNotes: item.configurationNotes,
    }));

    const invoiceSubtotal = quotation.subtotal;
    const invoiceDiscount = quotation.discountAmount;
    const invoiceTax = quotation.taxAmount;
    const invoiceTotal = quotation.total;

    // Concurrency-safe atomic invoice creation and quotation update
    const createdInvoice = await prisma.$transaction(async (tx) => {
      let invoiceNo: string;
      if (targetStatus === "ISSUED") {
        invoiceNo = await allocateInvoiceNoTx(tx);
      } else {
        invoiceNo = generateDraftInvoiceNo();
      }

      const inv = await tx.invoice.create({
        data: {
          invoiceNo,
          clientId: quotation.clientId,
          clientName: quotation.client.name,
          status: targetStatus as any,
          issuedAt: targetStatus === "ISSUED" ? new Date() : null,
          date: new Date(),
          dueDate: effectiveDueDate,
          subtotal: invoiceSubtotal,
          gstPercent: defaultGstRate,
          gstAmount: invoiceTax,
          discountAmount: invoiceDiscount,
          total: invoiceTotal,
          paidAmount: 0,
          balance: invoiceTotal,
          notes: quotation.notes,
          terms: defaultInvoiceTerms,
          items: {
            create: invoiceItems,
          },
        },
        include: {
          client: true,
          items: true,
        },
      });

      await tx.quotation.update({
        where: { id: quotationId },
        data: {
          status: "ACCEPTED",
          convertedToInvoiceId: inv.id,
        },
      });

      return inv;
    });

    const invoice = createdInvoice;


    return NextResponse.json({
      success: true,
      invoice,
      message: `Quotation ${quotation.quotationNo} successfully converted to Invoice ${invoice.invoiceNo}`,
    });
  } catch (error: any) {
    console.error("Failed to convert quotation to invoice:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to convert quotation" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { InvoicePDFTemplate } from "@/components/invoices/InvoicePDFTemplate";
import { getCanonicalInvoiceFinancials } from "@/lib/invoiceService";
import { getCompanySettings } from "@/lib/company";
import prisma from "@/lib/prisma";
import React from "react";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [invoice, financials, company] = await Promise.all([
      prisma.invoice.findUnique({
        where: { id: params.id },
        include: {
          client: true,
          items: true,
        },
      }),
      getCanonicalInvoiceFinancials(params.id),
      getCompanySettings(),
    ]);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const stream = await renderToStream(
      React.createElement(InvoicePDFTemplate, {
        invoice,
        client: invoice.client,
        financials: financials || undefined,
        company,
      }) as any
    );

    const res = new NextResponse(stream as any);
    res.headers.set("Content-Type", "application/pdf");
    res.headers.set(
      "Content-Disposition",
      `inline; filename="TamizhTech-Invoice-${invoice.invoiceNo}.pdf"`
    );

    return res;
  } catch (error: any) {
    console.error("PDF Gen Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

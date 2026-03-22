import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { InvoicePDFTemplate } from "@/components/invoices/InvoicePDFTemplate";
import prisma from "@/lib/prisma";
import React from "react";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: { 
        client: true,
        items: true
      }
    });
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    const client = invoice.client;

    const formattedInvoice = {
      ...invoice,
      items: invoice.items,
      createdAt: invoice.createdAt.toISOString()
    };

    const stream = await renderToStream(
      React.createElement(InvoicePDFTemplate, { invoice: formattedInvoice as any, client: client as any })
    );

    const res = new NextResponse(stream as any);
    res.headers.set("Content-Type", "application/pdf");
    res.headers.set("Content-Disposition", `inline; filename="Invoice_${invoice.invoiceNo}.pdf"`);
    
    return res;
  } catch (error: any) {
    console.error("PDF Gen Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


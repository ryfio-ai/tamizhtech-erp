import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { BusinessDocumentPDFTemplate } from "@/components/shared/BusinessDocumentPDFTemplate";
import { getNormalizedInvoiceData } from "@/lib/businessDocumentData";
import React from "react";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await getNormalizedInvoiceData(params.id);

    if (!data) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const stream = await renderToStream(
      React.createElement(BusinessDocumentPDFTemplate, { data }) as any
    );

    const res = new NextResponse(stream as any);
    res.headers.set("Content-Type", "application/pdf");
    res.headers.set(
      "Content-Disposition",
      `inline; filename="TamizhTech-Invoice-${data.documentNumber}.pdf"`
    );

    return res;
  } catch (error: any) {
    console.error("PDF Gen Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

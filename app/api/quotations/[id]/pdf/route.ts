import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { QuotationPDFTemplate } from "@/components/quotations/QuotationPDFTemplate";
import { getCompanySettings } from "@/lib/company";
import { getServerLogoDataUri } from "@/lib/serverLogo";
import prisma from "@/lib/prisma";
import React from "react";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [quotation, company] = await Promise.all([
      prisma.quotation.findUnique({
        where: { id: params.id },
        include: {
          client: true,
          items: true,
        },
      }),
      getCompanySettings(),
    ]);

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    const logoSrc = getServerLogoDataUri();

    const stream = await renderToStream(
      React.createElement(QuotationPDFTemplate, {
        quotation,
        client: quotation.client,
        company,
        logoSrc,
      }) as any
    );

    const res = new NextResponse(stream as any);
    res.headers.set("Content-Type", "application/pdf");
    res.headers.set(
      "Content-Disposition",
      `inline; filename="TamizhTech-Quotation-${quotation.quotationNo}.pdf"`
    );

    return res;
  } catch (error: any) {
    console.error("Quotation PDF Gen Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import React from "react";
import { getDeliveryChallanById } from "@/lib/challanService";
import { DeliveryChallanPDFTemplate } from "@/components/challans/DeliveryChallanPDFTemplate";
import { getServerLogoDataUri, getServerSignatureDataUri } from "@/lib/serverLogo";
import { DEFAULT_COMPANY_SETTINGS } from "@/lib/companyProfile";

export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const challan = await getDeliveryChallanById(params.id);
    if (!challan) {
      return NextResponse.json({ error: "Delivery Challan not found" }, { status: 404 });
    }

    const logoSrc = getServerLogoDataUri();
    const signatureSrc = getServerSignatureDataUri();

    const element = React.createElement(DeliveryChallanPDFTemplate, {
      challan,
      client: challan.client,
      company: DEFAULT_COMPANY_SETTINGS,
      logoSrc,
      signatureSrc,
    });

    const stream = await renderToStream(element as any);

    const res = new NextResponse(stream as any);
    res.headers.set("Content-Type", "application/pdf");
    res.headers.set(
      "Content-Disposition",
      `inline; filename="TamizhTech-Challan-${challan.challanNumber}.pdf"`
    );

    return res;
  } catch (error: any) {
    console.error("Delivery Challan PDF Gen Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

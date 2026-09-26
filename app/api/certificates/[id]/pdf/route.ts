import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import React from "react";
import {
  getCertificateById,
  getCertificateVerificationUrl,
  generateCertificateQrDataUri,
} from "@/lib/certificateService";
import { CertificatePDFTemplate } from "@/components/certificates/CertificatePDFTemplate";
import { getServerLogoDataUri, getServerSignatureDataUri } from "@/lib/serverLogo";
import { DEFAULT_COMPANY_SETTINGS } from "@/lib/companyProfile";

export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cert = await getCertificateById(params.id);
    if (!cert) {
      return NextResponse.json(
        { error: "Certificate not found." },
        { status: 404 }
      );
    }

    const logoSrc = getServerLogoDataUri();
    const signatureSrc = getServerSignatureDataUri();
    const verificationUrl = getCertificateVerificationUrl(cert.verificationId);
    let qrDataUri = "";
    try {
      qrDataUri = await generateCertificateQrDataUri(verificationUrl);
    } catch (qrErr) {
      console.warn("QR code generation warning for certificate PDF:", qrErr);
    }

    const element = React.createElement(CertificatePDFTemplate, {
      certificate: cert,
      company: DEFAULT_COMPANY_SETTINGS,
      logoSrc,
      signatureSrc,
      qrDataUri,
    });

    const stream = await renderToStream(element as any);

    const res = new NextResponse(stream as any);
    res.headers.set("Content-Type", "application/pdf");
    res.headers.set(
      "Content-Disposition",
      `inline; filename="Certificate-${cert.certificateNo}.pdf"`
    );

    return res;
  } catch (error: any) {
    console.error("Certificate PDF Generation Error:", error);
    return NextResponse.json(
      { error: "Unable to generate certificate PDF." },
      { status: 500 }
    );
  }
}

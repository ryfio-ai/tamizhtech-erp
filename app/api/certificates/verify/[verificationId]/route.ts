import { NextRequest, NextResponse } from "next/server";
import { verifyCertificatePublic } from "@/lib/certificateService";

export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: { verificationId: string } }
) {
  try {
    const verificationId = params.verificationId;
    if (!verificationId || verificationId.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid verification identifier." },
        { status: 400 }
      );
    }

    const verified = await verifyCertificatePublic(verificationId);
    if (!verified) {
      return NextResponse.json(
        { success: false, error: "Certificate not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: verified });
  } catch (error: any) {
    console.error("GET /api/certificates/verify/[verificationId] Error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred during verification." },
      { status: 500 }
    );
  }
}

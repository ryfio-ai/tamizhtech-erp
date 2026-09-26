import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  issueCertificate,
  listCertificates,
  CertificateStatus,
} from "@/lib/certificateService";

export const revalidate = 0;

const ALLOWED_CERT_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "OPERATIONS",
  "ENGINEERING",
];

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId") || undefined;
    const status = (searchParams.get("status") as CertificateStatus) || undefined;

    const certs = await listCertificates({ clientId, status });
    return NextResponse.json({ success: true, data: certs });
  } catch (error: any) {
    console.error("GET /api/certificates Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch certificates" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!ALLOWED_CERT_ROLES.includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You lack permission to issue certificates." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const created = await issueCertificate({
      ...body,
      userId: (session.user as any).id,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/certificates Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to issue certificate" },
      { status: 400 }
    );
  }
}

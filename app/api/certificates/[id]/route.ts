import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getCertificateById,
  voidCertificate,
  reissueCertificate,
} from "@/lib/certificateService";

export const revalidate = 0;

const ALLOWED_STAFF_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "OPERATIONS",
  "ENGINEERING",
];

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const cert = await getCertificateById(params.id);
    if (!cert) {
      return NextResponse.json(
        { success: false, error: "Certificate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: cert });
  } catch (error: any) {
    console.error("GET /api/certificates/[id] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch certificate" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!ALLOWED_STAFF_ROLES.includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You lack permission to modify certificates." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const action = body.action?.toUpperCase();

    if (action === "VOID") {
      if (!body.reason || typeof body.reason !== "string" || !body.reason.trim()) {
        return NextResponse.json(
          { success: false, error: "A reason is required to void a certificate." },
          { status: 400 }
        );
      }

      const voided = await voidCertificate(
        params.id,
        body.reason.trim(),
        (session.user as any).id
      );

      return NextResponse.json({ success: true, data: voided });
    }

    if (action === "REISSUE") {
      if (!body.reason || typeof body.reason !== "string" || !body.reason.trim()) {
        return NextResponse.json(
          { success: false, error: "A reason is required to reissue a certificate." },
          { status: 400 }
        );
      }

      const reissued = await reissueCertificate({
        certificateId: params.id,
        reason: body.reason.trim(),
        updatedProgramName: body.updatedProgramName,
        updatedCompletionDate: body.updatedCompletionDate,
        updatedDuration: body.updatedDuration,
        updatedTrainer: body.updatedTrainer,
        notes: body.notes,
        userId: (session.user as any).id,
      });

      return NextResponse.json({ success: true, data: reissued });
    }

    return NextResponse.json(
      { success: false, error: `Invalid action '${action}'. Expected 'VOID' or 'REISSUE'.` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("PATCH /api/certificates/[id] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update certificate" },
      { status: 400 }
    );
  }
}

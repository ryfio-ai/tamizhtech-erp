import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { normalizeMobile, isValidMobile } from "@/lib/phone";
import { allocateClientCodeTx, generateDraftQuotationNo } from "@/lib/sequence";

export const revalidate = 0;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { createQuotation = false } = body;

    const submission = await prisma.inboundSubmission.findUnique({
      where: { id },
    });

    if (!submission) {
      return NextResponse.json({ success: false, error: "Submission not found" }, { status: 404 });
    }

    if (submission.type !== "RFQ" && submission.type !== "CONTACT") {
      return NextResponse.json(
        { success: false, error: `Direct customer conversion is not applicable for ${submission.type}.` },
        { status: 400 }
      );
    }

    const targetName = (submission.name || "").trim();
    const targetPhone = (submission.mobile || "").trim();

    if (!targetName || targetName.length < 2) {
      return NextResponse.json(
        { success: false, error: "Contact name is missing or too short for customer creation." },
        { status: 400 }
      );
    }

    if (!targetPhone || !isValidMobile(targetPhone)) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid mobile / WhatsApp number is required to create a verified customer record.",
        },
        { status: 400 }
      );
    }

    const mobileNormalized = normalizeMobile(targetPhone);
    const user = session.user as any;

    // 1. Transactional check, create/link customer, update submission, optional draft quotation
    const result = await prisma.$transaction(async (tx) => {
      let client = await tx.client.findUnique({
        where: { mobileNormalized },
      });

      let isNewCustomer = false;

      if (!client) {
        const clientCode = await allocateClientCodeTx(tx);
        client = await tx.client.create({
          data: {
            clientCode,
            name: targetName,
            phone: targetPhone,
            mobileNormalized,
            email: submission.email ? submission.email.toLowerCase() : null,
            company: submission.company || null,
            city: submission.city || null,
            state: submission.state || null,
            status: "ACTIVE",
            type: "INDIVIDUAL",
            source: `Website ${submission.type} (${submission.submissionNo})`,
            notes: `Converted from Website Submission ${submission.submissionNo}`,
          },
        });
        isNewCustomer = true;
      }

      // Update submission with client linkage and CONVERTED status
      const updatedSubmission = await tx.inboundSubmission.update({
        where: { id },
        data: {
          clientId: client.id,
          status: "CONVERTED",
        },
      });

      // Audit Log for conversion
      await tx.submissionAuditLog.create({
        data: {
          submissionId: id,
          action: "CONVERTED_TO_CUSTOMER",
          actorType: "ADMIN",
          performedByUserId: user?.id || null,
          performedByName: user?.name || user?.email || "ERP Admin",
          details: {
            clientId: client.id,
            clientCode: client.clientCode,
            isNewCustomer,
          },
        },
      });

      let quotation: any = null;

      // 2. Optionally create a Draft Quotation if requested (especially for RFQs)
      if (createQuotation) {
        const quotationNo = generateDraftQuotationNo();
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 30); // 30 days default

        const payload = (submission.payload as any) || {};
        const quotationNotes = [
          `Website RFQ: ${submission.submissionNo}`,
          payload.productRequirements ? `Product Requirements: ${payload.productRequirements}` : "",
          payload.technicalRequirements ? `Technical Specs: ${payload.technicalRequirements}` : "",
          payload.quantity ? `Requested Qty: ${payload.quantity}` : "",
          payload.budget ? `Target Budget: ${payload.budget}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        quotation = await tx.quotation.create({
          data: {
            quotationNo,
            clientId: client.id,
            status: "DRAFT",
            validUntil,
            notes: quotationNotes,
            createdById: user?.id || null,
            subtotal: 0,
            discountAmount: 0,
            taxAmount: 0,
            total: 0,
          },
        });

        // Audit Log for quotation creation
        await tx.submissionAuditLog.create({
          data: {
            submissionId: id,
            action: "QUOTATION_CREATED",
            actorType: "ADMIN",
            performedByUserId: user?.id || null,
            performedByName: user?.name || user?.email || "ERP Admin",
            details: {
              quotationId: quotation.id,
              quotationNo: quotation.quotationNo,
            },
          },
        });
      }

      return { client, isNewCustomer, updatedSubmission, quotation };
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: result.isNewCustomer
        ? `New customer ${result.client.clientCode} created and linked successfully.`
        : `Linked to existing customer ${result.client.clientCode}.`,
    });
  } catch (error: any) {
    console.error("[SUBMISSION_CONVERT_ERROR]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

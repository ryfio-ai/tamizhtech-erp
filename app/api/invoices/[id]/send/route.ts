import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { BusinessDocumentPDFTemplate } from "@/components/shared/BusinessDocumentPDFTemplate";
import { getNormalizedInvoiceData } from "@/lib/businessDocumentData";
import { COMPANY_EMAIL_FOOTER_HTML, resend, SendEmailAttachment } from "@/lib/mail";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import React from "react";
import fs from "fs";
import path from "path";
import { fromPaise } from "@/lib/money";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        items: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    const documentData = await getNormalizedInvoiceData(params.id);
    if (!documentData) {
      return NextResponse.json({ success: false, error: "Unable to prepare invoice data for PDF" }, { status: 500 });
    }

    // Determine recipient email: client email, fallback to ryfioai@gmail.com if missing
    const recipientEmail = invoice.client?.email?.trim() || "ryfioai@gmail.com";
    const recipientName = invoice.client?.name || invoice.clientName || "Valued Customer";

    // 1. Generate Authoritative PDF Buffer
    const pdfBuffer = await renderToBuffer(
      React.createElement(BusinessDocumentPDFTemplate, {
        data: documentData,
      }) as any
    );

    // 2. Prepare Attachments (Only Bill PDF)
    const attachments: SendEmailAttachment[] = [
      {
        filename: `Tax_Invoice_${invoice.invoiceNo}.pdf`,
        content: Buffer.from(pdfBuffer),
        contentType: "application/pdf",
      },
    ];

    // 3. Dispatch via Resend
    if (!resend) {
      throw new Error("Resend API key is not configured.");
    }

    const fromAddress = process.env.EMAIL_FROM || "TamizhTech ERP <contact@tamizhtech.in>";
    const totalFormatted = fromPaise(invoice.total).toLocaleString("en-IN", { minimumFractionDigits: 2 });
    const balanceFormatted = fromPaise(invoice.balance).toLocaleString("en-IN", { minimumFractionDigits: 2 });

    const { data: resendResult, error: resendError } = await resend.emails.send({
      from: fromAddress,
      to: [recipientEmail],
      replyTo: "contact@tamizhtech.in",
      subject: `Tax Invoice #${invoice.invoiceNo} - Tamizh Tech Robotics Company`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <!-- Top Header with Brand Logo -->
          <div style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 28px 24px; text-align: center;">
            <img src="https://www.tamizhtech.in/logo/TTRC%20LOGO.png" alt="Tamizh Tech Robotics Company" style="height: 52px; width: auto; max-width: 220px; object-fit: contain; margin-bottom: 12px; display: inline-block;" />
            <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.5px;">TAMIZH TECH ROBOTICS COMPANY</h1>
            <p style="margin: 6px 0 0 0; color: #94A3B8; font-size: 13px;">Official Tax Invoice & Billing Statement</p>
          </div>

          <div style="padding: 28px 24px; color: #1E293B;">
            <p style="font-size: 16px; margin: 0 0 12px 0;">Dear <strong>${recipientName}</strong>,</p>
            <p style="font-size: 14.5px; line-height: 1.6; color: #334155; margin: 0 0 18px 0;">
              Thank you for partnering with Tamizh Tech Robotics Company. Please find attached the official Tax Invoice <strong>#${invoice.invoiceNo}</strong> for your review and accounting records.
            </p>
            
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 18px; margin: 20px 0;">
              <h3 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #0F172A; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px;">
                Invoice Summary
              </h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
                <tr>
                  <td style="padding: 7px 0; color: #64748B;">Invoice Number:</td>
                  <td style="padding: 7px 0; font-weight: 600; text-align: right; color: #0F172A;">${invoice.invoiceNo}</td>
                </tr>
                <tr>
                  <td style="padding: 7px 0; color: #64748B;">Invoice Date:</td>
                  <td style="padding: 7px 0; font-weight: 600; text-align: right; color: #0F172A;">${new Date(invoice.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                </tr>
                <tr>
                  <td style="padding: 7px 0; color: #64748B;">Total Amount:</td>
                  <td style="padding: 7px 0; font-weight: 700; text-align: right; color: #FF6B00; font-size: 15px;">₹${totalFormatted}</td>
                </tr>
                <tr>
                  <td style="padding: 7px 0; color: #64748B;">Balance Due:</td>
                  <td style="padding: 7px 0; font-weight: 700; text-align: right; color: ${invoice.balance > 0 ? "#DC2626" : "#16A34A"};">
                    ₹${balanceFormatted} ${invoice.balance <= 0 ? "(Paid ✓)" : ""}
                  </td>
                </tr>
              </table>
            </div>

            <!-- Attachment Notice -->
            <div style="background-color: #F1F5F9; border-left: 4px solid #FF6B00; border-radius: 4px; padding: 12px 16px; margin: 20px 0;">
              <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.5;">
                📎 <strong>Attached:</strong> The official Tax Invoice PDF with complete line-item specifications, tax breakdown, bank details, and digital authorization is attached.
              </p>
            </div>

            <!-- User Required Standard Closing & Footer -->
            ${COMPANY_EMAIL_FOOTER_HTML}
          </div>
        </div>
      `,
      attachments,
    });

    if (resendError) {
      console.error("[Resend API Error]:", resendError);

      await prisma.integrationLog.create({
        data: {
          provider: "RESEND",
          operation: "SEND_INVOICE",
          status: "FAILED",
          payload: JSON.stringify({ invoiceId: invoice.id, recipientEmail }),
          errorMessage: resendError.message,
        },
      });

      return NextResponse.json({ success: false, error: resendError.message }, { status: 500 });
    }

    // 4. Update Invoice sentAt timestamp
    const updatedSentAt = new Date();
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        sentAt: updatedSentAt,
      } as any,
    });

    // Record success in IntegrationLog and AuditLog
    await prisma.integrationLog.create({
      data: {
        provider: "RESEND",
        operation: "SEND_INVOICE",
        status: "SUCCESS",
        payload: JSON.stringify({ invoiceId: invoice.id, recipientEmail }),
        requestId: resendResult?.id,
      },
    });

    if ((session.user as any)?.id) {
      await prisma.auditLog.create({
        data: {
          action: "INVOICE_EMAIL_SENT",
          module: "INVOICES",
          entityId: invoice.id,
          userId: (session.user as any).id,
          newData: JSON.stringify({ recipientEmail, invoiceNo: invoice.invoiceNo, sentAt: updatedSentAt }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Invoice sent successfully to ${recipientEmail}`,
      messageId: resendResult?.id,
      sentAt: updatedSentAt.toISOString(),
    });
  } catch (error: any) {
    console.error("Send Invoice Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePDFTemplate } from "@/components/invoices/InvoicePDFTemplate";
import { getCanonicalInvoiceFinancials } from "@/lib/invoiceService";
import { getCompanySettings } from "@/lib/company";
import { resend } from "@/lib/mail";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import React from "react";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [invoice, financials, company] = await Promise.all([
      prisma.invoice.findUnique({
        where: { id: params.id },
        include: {
          client: true,
          items: true,
        },
      }),
      getCanonicalInvoiceFinancials(params.id),
      getCompanySettings(),
    ]);

    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    const recipientEmail = invoice.client?.email;
    const recipientName = invoice.client?.name || invoice.clientName || "Valued Customer";
    if (!recipientEmail) {
      return NextResponse.json(
        { success: false, error: "Customer does not have a registered email address." },
        { status: 400 }
      );
    }

    // 1. Generate PDF Buffer
    const pdfBuffer = await renderToBuffer(
      React.createElement(InvoicePDFTemplate, {
        invoice,
        client: invoice.client,
        financials: financials || undefined,
        company,
      }) as any
    );

    // 2. Dispatch via Resend
    if (!resend) {
      throw new Error("Resend API key is not configured.");
    }

    const { data: resendResult, error: resendError } = await resend.emails.send({
      from: `Tamizh Tech Robotics <${company.email}>`,
      to: [recipientEmail],
      subject: `Tax Invoice ${invoice.invoiceNo} - Tamizh Tech Robotics Company`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1B2A4A;">
          <h2 style="color: #FF6B00; border-bottom: 2px solid #FF6B00; padding-bottom: 8px;">Tamizh Tech Robotics Company</h2>
          <p>Dear <strong>${recipientName}</strong>,</p>
          <p>Thank you for choosing Tamizh Tech Robotics Company. Please find attached the official Tax Invoice <strong>${invoice.invoiceNo}</strong> for your records.</p>
          
          <div style="background-color: #FAFAFA; border: 1px solid #E5E5E5; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <table style="width: 100%; font-size: 14px;">
              <tr>
                <td style="color: #666666;">Invoice Number:</td>
                <td style="font-weight: bold; text-align: right;">${invoice.invoiceNo}</td>
              </tr>
              <tr>
                <td style="color: #666666;">Invoice Date:</td>
                <td style="font-weight: bold; text-align: right;">${new Date(invoice.date).toLocaleDateString("en-IN")}</td>
              </tr>
              <tr>
                <td style="color: #666666;">Total Amount:</td>
                <td style="font-weight: bold; text-align: right; color: #FF6B00;">₹${Number(invoice.total).toLocaleString("en-IN")}</td>
              </tr>
              <tr>
                <td style="color: #666666;">Balance Due:</td>
                <td style="font-weight: bold; text-align: right; color: ${invoice.balance > 0 ? "#DC2626" : "#16A34A"};">₹${Number(invoice.balance).toLocaleString("en-IN")}</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 13px; color: #555555;">If you have any questions concerning this invoice, please do not hesitate to contact us at <strong>${company.phone}</strong> or <strong>${company.email}</strong>.</p>
          
          <br/>
          <p style="font-size: 12px; color: #888888; border-top: 1px solid #EEEEEE; padding-top: 12px;">
            Tamizh Tech Robotics Company<br/>
            ${company.addressLine1}, ${company.addressLine2}, ${company.city}, ${company.state} - ${company.pincode}<br/>
            <a href="${company.website}" style="color: #FF6B00;">${company.website}</a>
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `Tax_Invoice_${invoice.invoiceNo}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (resendError) {
      console.error("[Resend API Error]:", resendError);

      // Record failed integration log
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
          newData: JSON.stringify({ recipientEmail, invoiceNo: invoice.invoiceNo }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Invoice sent successfully to ${recipientEmail}`,
      messageId: resendResult?.id,
    });
  } catch (error: any) {
    console.error("Send Invoice Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

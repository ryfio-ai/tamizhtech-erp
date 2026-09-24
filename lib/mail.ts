import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

const resendApiKey = process.env.RESEND_API_KEY;
export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export interface SendEmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  attachments?: SendEmailAttachment[];
}

export const COMPANY_EMAIL_FOOTER_HTML = `
  <div style="border-top: 1px solid #E2E8F0; padding-top: 16px; margin-top: 28px; font-size: 12px; color: #64748B; line-height: 1.6;">
    <p style="margin: 0 0 4px 0; font-weight: bold; color: #1B2A4A; font-size: 13px;">By</p>
    <p style="margin: 0 0 4px 0; font-weight: bold; color: #FF6B00; font-size: 13px;">Team Tamizh Tech Robotics Company</p>
    <p style="margin: 0 0 4px 0;">Sri Vari Garden, 22, 3rd Cross, Kurumbapalayam, SSKulam, Sarcarsamakulam, Coimbatore, Tamil Nadu, 641107</p>
    <p style="margin: 0 0 4px 0;">Phone: +91 81480 45030 | Email: <a href="mailto:contact@tamizhtech.in" style="color: #FF6B00; text-decoration: none;">contact@tamizhtech.in</a></p>
    <p style="margin: 0;">Website: <a href="https://www.tamizhtech.in/" style="color: #FF6B00; text-decoration: none;">https://www.tamizhtech.in/</a></p>
  </div>
`;

export const sendEmail = async ({ to, subject, html, from, replyTo, attachments }: SendEmailOptions) => {
  const fromAddress = from || process.env.EMAIL_FROM || 'TamizhTech ERP <contact@tamizhtech.in>';
  const replyToAddress = replyTo || process.env.EMAIL_REPLY_TO || 'contact@tamizhtech.in';

  if (!resend) {
    console.warn('[Resend] Warning: RESEND_API_KEY is not configured. Email skipped:', { to, subject });
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      replyTo: replyToAddress,
      subject,
      html,
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
    });

    if (error) {
      console.error('[Resend Error]', error);
      throw new Error(error.message);
    }

    console.log('[Resend Success] Email sent with ID:', data?.id);
    return { success: true, messageId: data?.id };
  } catch (error: any) {
    console.error('[Resend Exception] Dispatch failed:', error);
    throw error;
  }
};

export const sendLeadNotificationEmail = async (lead: {
  name: string;
  email?: string | null;
  phone?: string | null;
  requirement?: string | null;
  source?: string | null;
  leadNo?: string | null;
}) => {
  const targetEmail = process.env.LEAD_NOTIFICATION_EMAIL || 'contact@tamizhtech.in';
  const subject = `[New Lead] ${lead.leadNo || 'Inquiry'} - ${lead.name}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #0f172a; padding: 24px; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 22px;">New Website Lead Received</h2>
        <p style="margin-top: 4px; opacity: 0.8; font-size: 14px;">Tamizh Tech Robotics Company</p>
      </div>
      <div style="padding: 24px; color: #1e293b;">
        <p>A new customer inquiry has been captured in the system:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold; width: 35%;">Lead Number:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${lead.leadNo || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Client Name:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${lead.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Email:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${lead.email || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Phone:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${lead.phone || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Requirement:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${lead.requirement || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Source:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${lead.source || 'Website'}</td>
          </tr>
        </table>
        <p style="font-size: 14px; color: #64748b;">Please log in to the ERP portal to review and follow up.</p>
      </div>
      <div style="background-color: #f8fafc; padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
        TamizhTech ERP System &bull; Coimbatore, Tamil Nadu &bull; contact@tamizhtech.in
      </div>
    </div>
  `;

  return sendEmail({
    to: targetEmail,
    subject,
    html,
  });
};

export const getInvoiceEmailTemplate = (clientName: string, invoiceNo: string, amount: string, dueDate: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
    <div style="background-color: #0F172A; padding: 28px; text-align: center; color: white;">
      <img src="https://www.tamizhtech.in/logo/TTRC%20LOGO.png" alt="Tamizh Tech Logo" style="height: 48px; width: auto; max-width: 200px; object-fit: contain; margin-bottom: 10px;" />
      <h1 style="margin: 0; font-size: 22px; color: #FFFFFF;">Tamizh Tech Robotics Company</h1>
      <p style="margin-top: 4px; opacity: 0.85; font-size: 14px; color: #94A3B8;">Official Tax Invoice #${invoiceNo}</p>
    </div>
    <div style="padding: 28px; color: #1e293b;">
      <p>Dear <strong>${clientName}</strong>,</p>
      <p>Thank you for choosing Tamizh Tech Robotics Company. Please find attached the official Tax Invoice <strong>#${invoiceNo}</strong> for your records and accounting.</p>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #e2e8f0;">
        <table style="width: 100%;">
          <tr>
            <td style="color: #64748b; font-size: 13px; text-transform: uppercase;">Amount Due</td>
            <td style="text-align: right; font-weight: bold; font-size: 18px; color: #FF6B00;">${amount}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-size: 13px; text-transform: uppercase; padding-top: 8px;">Due Date</td>
            <td style="text-align: right; padding-top: 8px; color: #0f172a; font-weight: 600;">${dueDate}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 13.5px; color: #475569;">The complete itemized tax invoice PDF has been attached to this email.</p>

      ${COMPANY_EMAIL_FOOTER_HTML}
    </div>
  </div>
`;

export interface PaymentThankYouEmailDetails {
  clientName: string;
  amount: string;
  paymentNo: string;
  invoiceNo: string;
  paymentDate?: string;
  paymentMode?: string;
  referenceNo?: string;
  balance?: string;
}

export const getPaymentThankYouEmailHtml = ({
  clientName,
  amount,
  paymentNo,
  invoiceNo,
  paymentDate = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
  paymentMode = "UPI",
  referenceNo = "",
  balance = "₹0.00",
}: PaymentThankYouEmailDetails) => `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <!-- Top Header with Brand Logo -->
    <div style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 28px 24px; text-align: center;">
      <img src="https://www.tamizhtech.in/logo/TTRC%20LOGO.png" alt="Tamizh Tech Robotics Company" style="height: 52px; width: auto; max-width: 220px; object-fit: contain; margin-bottom: 12px; display: inline-block;" />
      <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.5px;">TAMIZH TECH ROBOTICS COMPANY</h1>
      <p style="margin: 6px 0 0 0; color: #94A3B8; font-size: 13px;">Industrial Automation • Robotics • STEM Solutions</p>
    </div>

    <!-- Status Banner -->
    <div style="background-color: #ECFDF5; border-bottom: 1px solid #A7F3D0; padding: 12px 24px; text-align: center;">
      <span style="display: inline-block; font-size: 13px; font-weight: 600; color: #065F46;">
        ✓ Payment Successfully Received & Confirmed
      </span>
    </div>

    <!-- Main Content -->
    <div style="padding: 28px 24px; color: #1E293B;">
      <p style="font-size: 16px; margin: 0 0 12px 0;">Dear <strong>${clientName}</strong>,</p>
      
      <p style="font-size: 14.5px; line-height: 1.6; color: #334155; margin: 0 0 18px 0;">
        Thank you for your business! We have successfully received and verified your payment of <strong style="color: #059669; font-size: 15px;">₹${amount}</strong> towards Tax Invoice <strong>#${invoiceNo}</strong>.
      </p>

      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
        Your prompt payment is greatly appreciated. We are thrilled to partner with you and look forward to delivering technological excellence on all your robotics and engineering endeavors.
      </p>

      <!-- Transaction Breakdown Card -->
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 18px; margin: 20px 0;">
        <h3 style="margin: 0 0 14px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #0F172A; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px;">
          Payment Receipt Summary
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
          <tr>
            <td style="padding: 7px 0; color: #64748B;">Invoice Number:</td>
            <td style="padding: 7px 0; font-weight: 600; text-align: right; color: #0F172A;">${invoiceNo}</td>
          </tr>
          <tr>
            <td style="padding: 7px 0; color: #64748B;">Receipt / Voucher:</td>
            <td style="padding: 7px 0; font-weight: 600; text-align: right; color: #0F172A;">${paymentNo}</td>
          </tr>
          <tr>
            <td style="padding: 7px 0; color: #64748B;">Payment Date:</td>
            <td style="padding: 7px 0; font-weight: 600; text-align: right; color: #0F172A;">${paymentDate}</td>
          </tr>
          <tr>
            <td style="padding: 7px 0; color: #64748B;">Payment Mode:</td>
            <td style="padding: 7px 0; font-weight: 600; text-align: right; color: #0F172A;">${paymentMode}</td>
          </tr>
          ${referenceNo ? `
          <tr>
            <td style="padding: 7px 0; color: #64748B;">Reference / Txn ID:</td>
            <td style="padding: 7px 0; font-weight: 600; text-align: right; color: #0F172A;">${referenceNo}</td>
          </tr>
          ` : ""}
          <tr style="border-top: 1px dashed #CBD5E1;">
            <td style="padding: 10px 0 6px 0; font-weight: 700; color: #0F172A;">Amount Paid:</td>
            <td style="padding: 10px 0 6px 0; font-weight: 700; text-align: right; color: #059669; font-size: 16px;">₹${amount}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748B;">Outstanding Balance:</td>
            <td style="padding: 4px 0; font-weight: 600; text-align: right; color: ${balance === "₹0.00" || balance === "0" || balance.includes("0.00") ? "#059669" : "#D97706"};">
              ${balance === "₹0.00" || balance === "0" || balance.includes("0.00") ? "₹0.00 (Fully Settled ✓)" : balance}
            </td>
          </tr>
        </table>
      </div>

      <!-- Attachment Banner -->
      <div style="background-color: #F1F5F9; border-left: 4px solid #FF6B00; border-radius: 4px; padding: 12px 16px; margin: 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.5;">
          📎 <strong>Bill & Receipt Attached:</strong> Your official updated Tax Invoice & Bill (PDF) has been attached to this email for your auditing and accounting records.
        </p>
      </div>

      <!-- User Required Standard Closing & Footer -->
      ${COMPANY_EMAIL_FOOTER_HTML}
    </div>
  </div>
`;

/**
 * Dispatches an industry standard Payment Receipt & Thank You email
 * with attached invoice bill (PDF) and company logo.
 */
export async function sendPaymentReceiptEmail({
  recipientEmail,
  clientName,
  amount,
  paymentNo,
  invoiceNo,
  paymentDate,
  paymentMode,
  referenceNo,
  balance,
  pdfBuffer,
}: PaymentThankYouEmailDetails & {
  recipientEmail: string;
  pdfBuffer?: Buffer;
}) {
  const subject = `Payment Received - Thank You | Tax Invoice #${invoiceNo} - Tamizh Tech Robotics`;
  const html = getPaymentThankYouEmailHtml({
    clientName,
    amount,
    paymentNo,
    invoiceNo,
    paymentDate,
    paymentMode,
    referenceNo,
    balance,
  });

  const attachments: SendEmailAttachment[] = [];

  // 1. Attach Bill PDF if provided (only bill attached)
  if (pdfBuffer) {
    attachments.push({
      filename: `Tax_Invoice_${invoiceNo}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    });
  }

  return sendEmail({
    to: recipientEmail,
    subject,
    html,
    attachments,
  });
}

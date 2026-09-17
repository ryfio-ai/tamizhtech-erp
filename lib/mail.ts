import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export const sendEmail = async ({ to, subject, html, from, replyTo }: SendEmailOptions) => {
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
    <div style="background-color: #C0392B; padding: 32px; text-align: center; color: white;">
      <h1 style="margin: 0; font-size: 24px;">TamizhTech</h1>
      <p style="margin-top: 5px; opacity: 0.9; font-size: 14px;">Invoice #${invoiceNo}</p>
    </div>
    <div style="padding: 32px; color: #1e293b;">
      <p>Dear <strong>${clientName}</strong>,</p>
      <p>An invoice <strong>#${invoiceNo}</strong> has been generated for your services with Tamizh Tech Robotics Company.</p>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #e2e8f0;">
        <table style="width: 100%;">
          <tr>
            <td style="color: #64748b; font-size: 13px; text-transform: uppercase;">Amount Due</td>
            <td style="text-align: right; font-weight: bold; font-size: 18px; color: #0f172a;">${amount}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-size: 13px; text-transform: uppercase; padding-top: 8px;">Due Date</td>
            <td style="text-align: right; padding-top: 8px; color: #0f172a;">${dueDate}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 14px; color: #475569;">Please ensure payment is settled before the due date.</p>
    </div>
    <div style="background-color: #f1f5f9; padding: 16px; text-align: center; color: #64748b; font-size: 12px;">
      Tamizh Tech Robotics Company &bull; Coimbatore, Tamil Nadu &bull; contact@tamizhtech.in
    </div>
  </div>
`;

export const getPaymentEmailTemplate = (clientName: string, amount: string, paymentId: string, invoiceNo: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
    <div style="background-color: #10b981; padding: 32px; text-align: center; color: white;">
      <h1 style="margin: 0; font-size: 24px;">Payment Received</h1>
      <p style="margin-top: 5px; opacity: 0.9; font-size: 14px;">Thank you for your business</p>
    </div>
    <div style="padding: 32px; color: #1e293b;">
      <p>Dear <strong>${clientName}</strong>,</p>
      <p>We have successfully received your payment of <strong>${amount}</strong> towards Invoice <strong>#${invoiceNo}</strong>.</p>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #e2e8f0;">
        <table style="width: 100%;">
          <tr>
            <td style="color: #64748b; font-size: 13px; text-transform: uppercase;">Receipt / Ref</td>
            <td style="text-align: right; font-weight: bold; color: #0f172a;">#${paymentId}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-size: 13px; text-transform: uppercase; padding-top: 8px;">Amount Paid</td>
            <td style="text-align: right; font-weight: bold; color: #10b981; font-size: 18px;">${amount}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 14px; color: #475569;">A formal receipt has been recorded in the ledger.</p>
    </div>
    <div style="background-color: #f1f5f9; padding: 16px; text-align: center; color: #64748b; font-size: 12px;">
      Tamizh Tech Robotics Company &bull; Coimbatore, Tamil Nadu &bull; contact@tamizhtech.in
    </div>
  </div>
`;

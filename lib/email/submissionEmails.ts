import { resend } from "@/lib/mail";

/**
 * Resolves the ERP public dashboard base URL from environment.
 * Never hardcodes a deployment URL; prioritizes ERP_PUBLIC_URL.
 */
export function getErpPublicUrl(): string {
  const url =
    process.env.ERP_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://erp.tamizhtech.in";
  return url.replace(/\/+$/, "");
}

const FROM_ADDRESS = process.env.EMAIL_FROM || "TamizhTech ERP <contact@tamizhtech.in>";
const ADMIN_EMAIL = process.env.LEAD_NOTIFICATION_EMAIL || process.env.COMPANY_EMAIL || "contact@tamizhtech.in";


export interface EmailDispatchResult {
  success: boolean;
  messageId?: string;
  error?: string;
  skipped?: boolean;
}

// ─── Customer / Applicant Thank-You Templates ─────────────────────────

function getThankYouSubject(type: string, submissionNo: string): string {
  switch (type) {
    case "RFQ":
      return `[TamizhTech] RFQ Confirmation - ${submissionNo}`;
    case "CONTACT":
      return `[TamizhTech] Inquiry Received - ${submissionNo}`;
    case "CAREER":
      return `[TamizhTech] Application Received - ${submissionNo}`;
    case "CLUB_REGISTRATION":
      return `[TamizhTech] Robotics Club Registration Confirmation - ${submissionNo}`;
    default:
      return `[TamizhTech] Request Confirmation - ${submissionNo}`;
  }
}

function getThankYouHtml(submission: any): string {
  const { type, name, submissionNo } = submission;
  const payload = (submission.payload as any) || {};

  let specificDetailsHtml = "";
  if (type === "RFQ") {
    specificDetailsHtml = `
      <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 8px 0; font-weight: bold; color: #0f172a;">Request Details:</p>
        <p style="margin: 4px 0; font-size: 14px; color: #475569;"><strong>Requirements:</strong> ${payload.productRequirements || submission.message || "Custom Robotics Specification"}</p>
        ${payload.quantity ? `<p style="margin: 4px 0; font-size: 14px; color: #475569;"><strong>Quantity:</strong> ${payload.quantity}</p>` : ""}
        ${payload.deliveryTimeline ? `<p style="margin: 4px 0; font-size: 14px; color: #475569;"><strong>Timeline:</strong> ${payload.deliveryTimeline}</p>` : ""}
      </div>
      <p style="font-size: 14px; color: #475569;">Our engineering and sales team will review your technical specifications and prepare a formal quotation shortly.</p>
    `;
  } else if (type === "CONTACT") {
    specificDetailsHtml = `
      <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 8px 0; font-weight: bold; color: #0f172a;">Message Summary:</p>
        <p style="margin: 4px 0; font-size: 14px; color: #475569;"><strong>Subject:</strong> ${submission.subject || "General Inquiry"}</p>
        <p style="margin: 4px 0; font-size: 14px; color: #475569;">${submission.message || ""}</p>
      </div>
      <p style="font-size: 14px; color: #475569;">A representative from our team will get in touch with you within 24 business hours.</p>
    `;
  } else if (type === "CAREER") {
    specificDetailsHtml = `
      <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 8px 0; font-weight: bold; color: #0f172a;">Position Applied:</p>
        <p style="margin: 4px 0; font-size: 15px; font-weight: bold; color: #0f172a;">${payload.position || "Robotics Engineering"}</p>
        ${payload.experience ? `<p style="margin: 4px 0; font-size: 14px; color: #475569;"><strong>Experience:</strong> ${payload.experience}</p>` : ""}
      </div>
      <p style="font-size: 14px; color: #475569;">Our talent acquisition team will review your qualifications and reach out if your profile matches our requirements.</p>
    `;
  } else if (type === "CLUB_REGISTRATION") {
    specificDetailsHtml = `
      <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 8px 0; font-weight: bold; color: #0f172a;">Registration Details:</p>
        <p style="margin: 4px 0; font-size: 14px; color: #475569;"><strong>Institution:</strong> ${payload.institution || "College / University"}</p>
        ${payload.department ? `<p style="margin: 4px 0; font-size: 14px; color: #475569;"><strong>Department:</strong> ${payload.department}</p>` : ""}
        ${payload.year ? `<p style="margin: 4px 0; font-size: 14px; color: #475569;"><strong>Year:</strong> ${payload.year}</p>` : ""}
      </div>
      <p style="font-size: 14px; color: #475569;">Welcome to the TamizhTech Robotics Club community! You will receive further orientation details and access links shortly.</p>
    `;
  }

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #0f172a; padding: 28px; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 22px; font-weight: 700;">Tamizh Tech Robotics Company</h2>
        <p style="margin-top: 6px; opacity: 0.85; font-size: 14px;">Acknowledgement of Receipt</p>
      </div>
      <div style="padding: 28px; color: #1e293b;">
        <p style="font-size: 16px;">Dear <strong>${name}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.6; color: #334155;">
          Thank you for reaching out to TamizhTech. Your submission has been securely logged into our authoritative system under Reference Number:
        </p>
        <div style="text-align: center; margin: 20px 0;">
          <span style="display: inline-block; background-color: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 10px 20px; font-family: monospace; font-size: 18px; font-weight: bold; color: #0f172a;">
            ${submissionNo}
          </span>
        </div>
        ${specificDetailsHtml}
      </div>
      <div style="background-color: #f8fafc; padding: 18px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;">
        Tamizh Tech Robotics Company &bull; Coimbatore, Tamil Nadu &bull; contact@tamizhtech.in
      </div>
    </div>
  `;
}

// ─── Admin Notification Template ──────────────────────────────────────

function getAdminNotificationHtml(submission: any): string {
  const { type, name, mobile, email, company, city, state, submissionNo, createdAt } = submission;
  const payload = (submission.payload as any) || {};
  const attachment = (submission.attachmentMetadata as any) || {};

  const rows: Array<{ label: string; value: string }> = [
    { label: "Submission Reference", value: submissionNo },
    { label: "Submission Type", value: type },
    { label: "Contact Name", value: name },
    { label: "Mobile", value: mobile || "N/A" },
    { label: "Email", value: email || "N/A" },
    { label: "Company / Organization", value: company || "N/A" },
    { label: "Location", value: [city, state].filter(Boolean).join(", ") || "N/A" },
    { label: "Created At", value: new Date(createdAt || Date.now()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) },
  ];

  if (type === "RFQ") {
    if (payload.productRequirements) rows.push({ label: "Product Requirements", value: payload.productRequirements });
    if (payload.quantity) rows.push({ label: "Quantity", value: String(payload.quantity) });
    if (payload.budget) rows.push({ label: "Budget", value: payload.budget });
    if (payload.deliveryTimeline) rows.push({ label: "Timeline", value: payload.deliveryTimeline });
    if (payload.technicalRequirements) rows.push({ label: "Technical Specs", value: payload.technicalRequirements });
  } else if (type === "CONTACT") {
    if (submission.subject) rows.push({ label: "Subject", value: submission.subject });
    if (submission.message) rows.push({ label: "Message", value: submission.message });
  } else if (type === "CAREER") {
    if (payload.position) rows.push({ label: "Position Applied", value: payload.position });
    if (payload.qualification) rows.push({ label: "Qualification", value: payload.qualification });
    if (payload.experience) rows.push({ label: "Experience", value: payload.experience });
    if (attachment.fileName) {
      rows.push({
        label: "Resume Attachment",
        value: `${attachment.fileName} (${Math.round((attachment.size || 0) / 1024)} KB) [Storage Key: ${attachment.storageKey}]`
      });
    }
  } else if (type === "CLUB_REGISTRATION") {
    if (payload.institution) rows.push({ label: "Institution", value: payload.institution });
    if (payload.department) rows.push({ label: "Department", value: payload.department });
    if (payload.year) rows.push({ label: "Year / Class", value: payload.year });
    if (payload.interests) rows.push({ label: "Interests", value: Array.isArray(payload.interests) ? payload.interests.join(", ") : payload.interests });
  }

  const tableRows = rows
    .map(
      r => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; width: 35%; color: #475569; font-size: 13px;">${r.label}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px;">${r.value}</td>
      </tr>
    `
    )
    .join("");

  const erpUrl = `${getErpPublicUrl()}/submissions`;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #1e293b; padding: 24px; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 20px;">[Action Required] New ${type} Received</h2>
        <p style="margin-top: 4px; opacity: 0.8; font-size: 13px;">TamizhTech Operational Portal</p>
      </div>
      <div style="padding: 24px; color: #1e293b;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          ${tableRows}
        </table>
        <div style="text-align: center; margin-top: 24px;">
          <a href="${erpUrl}" style="background-color: #0284c7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
            Open in ERP Dashboard
          </a>
        </div>
      </div>
      <div style="background-color: #f8fafc; padding: 14px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #e2e8f0;">
        TamizhTech ERP Automated Dispatch &bull; Internal Notification
      </div>
    </div>
  `;
}

// ─── Dispatch Functions ───────────────────────────────────────────────

export async function sendCustomerThankYouEmail(submission: any): Promise<EmailDispatchResult> {
  const recipientEmail = submission.email?.trim();
  if (!recipientEmail) {
    return { success: true, skipped: true, error: "No customer email address provided" };
  }

  if (!resend) {
    console.warn("[RESEND_WARN] RESEND_API_KEY not configured. Skipping customer thank-you email:", recipientEmail);
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const subject = getThankYouSubject(submission.type, submission.submissionNo);
  const html = getThankYouHtml(submission);

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [recipientEmail],
      subject,
      html,
    });

    if (error) {
      console.error("[RESEND_CUSTOMER_EMAIL_ERROR]:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err: any) {
    console.error("[RESEND_CUSTOMER_EXCEPTION]:", err);
    return { success: false, error: err?.message || "Failed to dispatch email" };
  }
}

export async function sendAdminNotificationEmail(submission: any): Promise<EmailDispatchResult> {
  if (!resend) {
    console.warn("[RESEND_WARN] RESEND_API_KEY not configured. Skipping admin notification email:", ADMIN_EMAIL);
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const subject = `[New ${submission.type}] ${submission.submissionNo} - ${submission.name}`;
  const html = getAdminNotificationHtml(submission);

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [ADMIN_EMAIL],
      subject,
      html,
    });

    if (error) {
      console.error("[RESEND_ADMIN_EMAIL_ERROR]:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err: any) {
    console.error("[RESEND_ADMIN_EXCEPTION]:", err);
    return { success: false, error: err?.message || "Failed to dispatch email" };
  }
}

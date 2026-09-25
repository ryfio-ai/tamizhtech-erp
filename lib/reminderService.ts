/**
 * TamizhTech ERP 2.0 — Payment Reminder Service
 * 
 * Manages automated & manual payment reminder lifecycle:
 * - State classification: UPCOMING, DUE_TODAY, OVERDUE, PAID_IN_FULL, NOT_PAYABLE
 * - Resend email dispatch with professional HTML/text templates
 * - Atomic deduplication via IdempotencyRecord
 * - Delivery history & audit trail via IntegrationLog & AuditLog
 * - Read-only financial safety: NEVER mutates invoice balance or payment ledger
 */

import prisma from "@/lib/prisma";
import { resend, COMPANY_EMAIL_FOOTER_HTML } from "@/lib/mail";
import { fromPaise, toPaise } from "@/lib/money";
import { getCanonicalInvoiceFinancials } from "@/lib/invoiceService";
import crypto from "crypto";

export type ReminderState = "UPCOMING" | "DUE_TODAY" | "OVERDUE" | "PAID_IN_FULL" | "NOT_PAYABLE";

export interface ReminderEligibility {
  isEligible: boolean;
  state: ReminderState;
  reason?: string;
  daysDifference: number; // positive = days until due, 0 = due today, negative = days overdue
  daysOverdue: number;
  outstandingBalanceRupees: number;
  totalRupees: number;
  paidRupees: number;
  dueDate: Date | null;
  clientEmail: string | null;
  clientName: string;
}

export interface ReminderHistoryItem {
  id: string;
  createdAt: string;
  reminderState: ReminderState;
  status: "SUCCESS" | "FAILED";
  recipientEmail: string;
  errorMessage?: string | null;
  requestId?: string | null;
  daysOverdue?: number;
  balanceRupees?: number;
}

/**
 * Normalizes date to midnight UTC/local calendar day to avoid timezone/hour discrepancies.
 */
function normalizeToDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Evaluates whether an invoice is eligible for a payment reminder and its current state.
 */
export function evaluateReminderEligibility(invoice: {
  status: string;
  dueDate?: Date | string | null;
  balance: number; // in paise
  total: number;   // in paise
  paidAmount: number; // in paise
  client?: { name: string; email?: string | null } | null;
  clientName?: string;
}): ReminderEligibility {
  const balancePaise = Math.max(0, invoice.balance || 0);
  const totalPaise = Math.max(0, invoice.total || 0);
  const paidPaise = Math.max(0, invoice.paidAmount || 0);

  const balanceRupees = fromPaise(balancePaise);
  const totalRupees = fromPaise(totalPaise);
  const paidRupees = fromPaise(paidPaise);

  const clientName = invoice.client?.name || invoice.clientName || "Valued Customer";
  const clientEmail = invoice.client?.email?.trim() || null;

  // 1. Paid in Full check
  if (balancePaise <= 0 || invoice.status === "PAID") {
    return {
      isEligible: false,
      state: "PAID_IN_FULL",
      reason: "This invoice is already fully paid. No reminders are needed.",
      daysDifference: 0,
      daysOverdue: 0,
      outstandingBalanceRupees: 0,
      totalRupees,
      paidRupees,
      dueDate: invoice.dueDate ? new Date(invoice.dueDate) : null,
      clientEmail,
      clientName,
    };
  }

  // 2. Cancelled or non-payable state check
  if (invoice.status === "CANCELLED" || invoice.status === "DRAFT") {
    return {
      isEligible: false,
      state: "NOT_PAYABLE",
      reason: `Invoice is in ${invoice.status} status and is not payable.`,
      daysDifference: 0,
      daysOverdue: 0,
      outstandingBalanceRupees: balanceRupees,
      totalRupees,
      paidRupees,
      dueDate: invoice.dueDate ? new Date(invoice.dueDate) : null,
      clientEmail,
      clientName,
    };
  }

  // 3. Due date check
  if (!invoice.dueDate) {
    return {
      isEligible: false,
      state: "NOT_PAYABLE",
      reason: "No due date is set for this invoice.",
      daysDifference: 0,
      daysOverdue: 0,
      outstandingBalanceRupees: balanceRupees,
      totalRupees,
      paidRupees,
      dueDate: null,
      clientEmail,
      clientName,
    };
  }

  const dueDate = new Date(invoice.dueDate);
  const today = normalizeToDateOnly(new Date());
  const dueDay = normalizeToDateOnly(dueDate);

  // Difference in whole calendar days (dueDay - today)
  const diffTime = dueDay.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  let state: ReminderState = "UPCOMING";
  let daysOverdue = 0;

  if (diffDays < 0) {
    state = "OVERDUE";
    daysOverdue = Math.abs(diffDays);
  } else if (diffDays === 0) {
    state = "DUE_TODAY";
    daysOverdue = 0;
  } else {
    state = "UPCOMING";
    daysOverdue = 0;
  }

  return {
    isEligible: true,
    state,
    daysDifference: diffDays,
    daysOverdue,
    outstandingBalanceRupees: balanceRupees,
    totalRupees,
    paidRupees,
    dueDate,
    clientEmail,
    clientName,
  };
}

/**
 * Builds email templates based on the reminder state.
 */
export function buildReminderEmailContent(params: {
  customerName: string;
  invoiceNo: string;
  invoiceDate: Date | string;
  dueDate: Date | string;
  totalRupees: number;
  paidRupees: number;
  balanceRupees: number;
  state: ReminderState;
  daysOverdue?: number;
}) {
  const {
    customerName,
    invoiceNo,
    invoiceDate,
    dueDate,
    totalRupees,
    paidRupees,
    balanceRupees,
    state,
    daysOverdue = 0,
  } = params;

  const formattedInvoiceDate = new Date(invoiceDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const formattedDueDate = new Date(dueDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const formattedTotal = totalRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 });
  const formattedPaid = paidRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 });
  const formattedBalance = balanceRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 });

  let subject = `Payment Reminder — Invoice #${invoiceNo}`;
  let stateHeadline = "Upcoming Payment Notice";
  let stateMessage = `This is a friendly reminder that payment for Invoice <strong>#${invoiceNo}</strong> is due on <strong>${formattedDueDate}</strong>.`;
  let badgeColor = "#3B82F6"; // blue
  let badgeText = "UPCOMING";

  if (state === "DUE_TODAY") {
    subject = `Payment Due Today — Invoice #${invoiceNo}`;
    stateHeadline = "Payment Due Today";
    stateMessage = `This is a reminder that payment for Invoice <strong>#${invoiceNo}</strong> is due <strong>today (${formattedDueDate})</strong>.`;
    badgeColor = "#F59E0B"; // amber
    badgeText = "DUE TODAY";
  } else if (state === "OVERDUE") {
    subject = `Overdue Payment Notice — Invoice #${invoiceNo}`;
    stateHeadline = "Overdue Payment Notice";
    stateMessage = `We notice that payment for Invoice <strong>#${invoiceNo}</strong> is currently <strong>${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue</strong> (Original due date: ${formattedDueDate}). We kindly request you to process the payment at your earliest convenience.`;
    badgeColor = "#EF4444"; // red
    badgeText = `${daysOverdue} DAYS OVERDUE`;
  }

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <!-- Top Header -->
      <div style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 28px 24px; text-align: center;">
        <img src="https://www.tamizhtech.in/logo/TTRC%20LOGO.png" alt="Tamizh Tech" style="height: 48px; width: auto; max-width: 200px; object-fit: contain; margin-bottom: 12px; display: inline-block;" />
        <h1 style="margin: 0; font-size: 19px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.5px;">TAMIZH TECH ROBOTICS COMPANY</h1>
        <p style="margin: 6px 0 0 0; color: #94A3B8; font-size: 13px;">Billing & Payment Reminder</p>
      </div>

      <!-- Main Body -->
      <div style="padding: 28px 24px; color: #1E293B;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <p style="font-size: 16px; margin: 0;">Dear <strong>${customerName}</strong>,</p>
          <span style="display: inline-block; background-color: ${badgeColor}; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; rounded-radius: 6px; border-radius: 6px; letter-spacing: 0.5px;">
            ${badgeText}
          </span>
        </div>

        <p style="font-size: 14.5px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
          ${stateMessage}
        </p>

        <!-- Invoice Breakdown Box -->
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 18px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #0F172A; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px;">
            Invoice & Payment Details
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
            <tr>
              <td style="padding: 6px 0; color: #64748B;">Invoice Number:</td>
              <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #0F172A;">${invoiceNo}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748B;">Invoice Date:</td>
              <td style="padding: 6px 0; font-weight: 500; text-align: right; color: #334155;">${formattedInvoiceDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748B;">Due Date:</td>
              <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #0F172A;">${formattedDueDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748B;">Total Amount:</td>
              <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #0F172A;">₹${formattedTotal}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748B;">Amount Paid:</td>
              <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #10B981;">₹${formattedPaid}</td>
            </tr>
            <tr style="border-top: 1px dashed #CBD5E1;">
              <td style="padding: 10px 0 4px 0; font-size: 14.5px; font-weight: 700; color: #0F172A;">Outstanding Balance:</td>
              <td style="padding: 10px 0 4px 0; font-size: 16px; font-weight: 800; text-align: right; color: #EA580C;">₹${formattedBalance}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 13.5px; line-height: 1.5; color: #64748B; margin: 18px 0 0 0;">
          If payment has already been initiated, please disregard this reminder and share the transaction reference with us for account reconciliation.
        </p>

        <!-- Company Contact Footer -->
        ${COMPANY_EMAIL_FOOTER_HTML}
      </div>
    </div>
  `;

  return { subject, html };
}

/**
 * Sends a payment reminder for a specific invoice.
 * Enforces atomic idempotency, Resend dispatch, IntegrationLog & AuditLog persistence.
 */
export async function sendPaymentReminder(params: {
  invoiceId: string;
  forceManual?: boolean;
  userId?: string;
}): Promise<{
  success: boolean;
  state: ReminderState;
  messageId?: string;
  error?: string;
  skipped?: boolean;
  reason?: string;
}> {
  const { invoiceId, forceManual = false, userId } = params;

  // 1. Fetch authoritative invoice and customer details
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      client: true,
      payments: true,
    },
  });

  if (!invoice) {
    return { success: false, state: "NOT_PAYABLE", error: "Invoice not found" };
  }

  // 2. Fetch authoritative financials directly from invoice ledger
  const canonical = await getCanonicalInvoiceFinancials(invoice.id);
  const balancePaise = canonical ? toPaise(canonical.outstandingBalance) : invoice.balance;
  const totalPaise = canonical ? toPaise(canonical.totalAmount) : invoice.total;
  const paidPaise = canonical ? toPaise(canonical.netPaidAmount) : invoice.paidAmount;

  // 3. Evaluate Eligibility
  const eligibility = evaluateReminderEligibility({
    status: invoice.status,
    dueDate: invoice.dueDate,
    balance: balancePaise,
    total: totalPaise,
    paidAmount: paidPaise,
    client: invoice.client,
    clientName: invoice.clientName,
  });

  if (!eligibility.isEligible) {
    return {
      success: false,
      state: eligibility.state,
      error: eligibility.reason || "Invoice is not eligible for payment reminder",
    };
  }

  const recipientEmail = eligibility.clientEmail;
  if (!recipientEmail) {
    return {
      success: false,
      state: eligibility.state,
      error: "No customer email is available for this invoice.",
    };
  }

  // 4. Idempotency & Deduplication
  // Key format: rem_<invoiceId>_<state>_<YYYY-MM-DD>
  const todayStr = new Date().toISOString().split("T")[0];
  const idempotencyKey = `rem_${invoice.id}_${eligibility.state}_${todayStr}`;
  const scope = "PAYMENT_REMINDER";

  if (!forceManual) {
    const existing = await prisma.idempotencyRecord.findUnique({
      where: {
        key_scope: {
          key: idempotencyKey,
          scope,
        },
      },
    });

    if (existing) {
      return {
        success: true,
        state: eligibility.state,
        skipped: true,
        reason: `Reminder already sent today (${eligibility.state})`,
      };
    }
  }

  // 5. Build Email Content
  const { subject, html } = buildReminderEmailContent({
    customerName: eligibility.clientName,
    invoiceNo: invoice.invoiceNo,
    invoiceDate: invoice.date,
    dueDate: eligibility.dueDate!,
    totalRupees: eligibility.totalRupees,
    paidRupees: eligibility.paidRupees,
    balanceRupees: eligibility.outstandingBalanceRupees,
    state: eligibility.state,
    daysOverdue: eligibility.daysOverdue,
  });

  const fromAddress = process.env.EMAIL_FROM || "TamizhTech ERP <contact@tamizhtech.in>";
  const payloadData = {
    invoiceId: invoice.id,
    invoiceNo: invoice.invoiceNo,
    recipientEmail,
    recipientName: eligibility.clientName,
    reminderState: eligibility.state,
    daysOverdue: eligibility.daysOverdue,
    balanceRupees: eligibility.outstandingBalanceRupees,
    totalRupees: eligibility.totalRupees,
    dueDate: eligibility.dueDate?.toISOString(),
  };

  // 6. Dispatch via Resend
  if (!resend) {
    const errMessage = "Resend API key is not configured.";
    console.error("[Reminder Resend Error]:", errMessage);

    // Persist failure in IntegrationLog
    await prisma.integrationLog.create({
      data: {
        provider: "RESEND",
        operation: "PAYMENT_REMINDER",
        status: "FAILED",
        payload: JSON.stringify(payloadData),
        errorMessage: errMessage,
      },
    });

    if (userId) {
      await prisma.auditLog.create({
        data: {
          action: "PAYMENT_REMINDER_FAILED",
          module: "FINANCE",
          entityId: invoice.id,
          userId,
          newData: JSON.stringify({ error: errMessage, invoiceNo: invoice.invoiceNo }),
        },
      });
    }

    return { success: false, state: eligibility.state, error: errMessage };
  }

  try {
    const { data: resendResult, error: resendError } = await resend.emails.send({
      from: fromAddress,
      to: [recipientEmail],
      replyTo: "contact@tamizhtech.in",
      subject,
      html,
    });

    if (resendError) {
      console.error("[Reminder Resend API Error]:", resendError);

      await prisma.integrationLog.create({
        data: {
          provider: "RESEND",
          operation: "PAYMENT_REMINDER",
          status: "FAILED",
          payload: JSON.stringify(payloadData),
          errorMessage: resendError.message,
        },
      });

      if (userId) {
        await prisma.auditLog.create({
          data: {
            action: "PAYMENT_REMINDER_FAILED",
            module: "FINANCE",
            entityId: invoice.id,
            userId,
            newData: JSON.stringify({ error: resendError.message, invoiceNo: invoice.invoiceNo }),
          },
        });
      }

      return { success: false, state: eligibility.state, error: resendError.message };
    }

    // 7. Persist Idempotency Record (Expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const requestHash = crypto
      .createHash("sha256")
      .update(JSON.stringify({ ...payloadData, date: todayStr }))
      .digest("hex");

    await prisma.idempotencyRecord.upsert({
      where: {
        key_scope: {
          key: idempotencyKey,
          scope,
        },
      },
      update: {
        status: "PROCESSED",
        responseSnapshot: JSON.stringify({ messageId: resendResult?.id }),
      },
      create: {
        key: idempotencyKey,
        scope,
        requestHash,
        entityType: "INVOICE",
        entityId: invoice.id,
        status: "PROCESSED",
        responseSnapshot: JSON.stringify({ messageId: resendResult?.id }),
        expiresAt,
      },
    });

    // 8. Persist Success in IntegrationLog
    await prisma.integrationLog.create({
      data: {
        provider: "RESEND",
        operation: "PAYMENT_REMINDER",
        status: "SUCCESS",
        payload: JSON.stringify(payloadData),
        requestId: resendResult?.id,
      },
    });

    // 9. Persist in AuditLog
    if (userId) {
      await prisma.auditLog.create({
        data: {
          action: "PAYMENT_REMINDER_SENT",
          module: "FINANCE",
          entityId: invoice.id,
          userId,
          newData: JSON.stringify({
            invoiceNo: invoice.invoiceNo,
            recipientEmail,
            state: eligibility.state,
            messageId: resendResult?.id,
          }),
        },
      });
    }

    return {
      success: true,
      state: eligibility.state,
      messageId: resendResult?.id,
    };
  } catch (err: any) {
    console.error("[Reminder Dispatch Exception]:", err);

    await prisma.integrationLog.create({
      data: {
        provider: "RESEND",
        operation: "PAYMENT_REMINDER",
        status: "FAILED",
        payload: JSON.stringify(payloadData),
        errorMessage: err.message || "Network exception during email dispatch",
      },
    });

    return {
      success: false,
      state: eligibility.state,
      error: err.message || "Failed to dispatch email",
    };
  }
}

/**
 * Retrieves authoritative reminder history for an invoice directly from IntegrationLog.
 */
export async function getInvoiceReminderHistory(invoiceId: string): Promise<ReminderHistoryItem[]> {
  try {
    const logs = await prisma.integrationLog.findMany({
      where: {
        operation: "PAYMENT_REMINDER",
        payload: {
          contains: invoiceId,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return logs.map((log) => {
      let payloadObj: any = {};
      try {
        if (log.payload) payloadObj = JSON.parse(log.payload);
      } catch {
        payloadObj = {};
      }

      return {
        id: log.id,
        createdAt: log.createdAt.toISOString(),
        reminderState: (payloadObj.reminderState as ReminderState) || "OVERDUE",
        status: log.status === "SUCCESS" ? "SUCCESS" : "FAILED",
        recipientEmail: payloadObj.recipientEmail || "Unknown",
        errorMessage: log.errorMessage,
        requestId: log.requestId,
        daysOverdue: payloadObj.daysOverdue,
        balanceRupees: payloadObj.balanceRupees,
      };
    });
  } catch (err) {
    console.error("Failed to load invoice reminder history:", err);
    return [];
  }
}

/**
 * Scheduled job: iterates over all issued/active invoices with balance > 0
 * and dispatches deduplicated payment reminders for eligible UPCOMING, DUE_TODAY, or OVERDUE invoices.
 */
export async function processAllEligibleReminders(options?: {
  maxBatch?: number;
}): Promise<{
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  results: Array<{ invoiceNo: string; state: string; status: string; reason?: string }>;
}> {
  const maxBatch = options?.maxBatch || 50;

  // 1. Fetch active issued/partially paid invoices with positive balance
  const invoices = await prisma.invoice.findMany({
    where: {
      status: {
        in: ["ISSUED", "PARTIALLY_PAID"],
      },
      balance: {
        gt: 0,
      },
    },
    include: {
      client: true,
      payments: true,
    },
    take: maxBatch,
    orderBy: { dueDate: "asc" },
  });

  const results: Array<{ invoiceNo: string; state: string; status: string; reason?: string }> = [];
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const inv of invoices) {
    try {
      const eligibility = evaluateReminderEligibility({
        status: inv.status,
        dueDate: inv.dueDate,
        balance: inv.balance,
        total: inv.total,
        paidAmount: inv.paidAmount,
        client: inv.client,
        clientName: inv.clientName,
      });

      if (!eligibility.isEligible) {
        continue;
      }

      // We only send reminders if upcoming within 3 days, due today, or overdue
      if (eligibility.state === "UPCOMING" && eligibility.daysDifference > 3) {
        continue; // Not close enough to due date yet
      }

      const res = await sendPaymentReminder({
        invoiceId: inv.id,
        forceManual: false,
      });

      if (res.skipped) {
        skipped++;
        results.push({
          invoiceNo: inv.invoiceNo,
          state: eligibility.state,
          status: "SKIPPED",
          reason: res.reason,
        });
      } else if (res.success) {
        sent++;
        results.push({
          invoiceNo: inv.invoiceNo,
          state: eligibility.state,
          status: "SENT",
        });
      } else {
        failed++;
        results.push({
          invoiceNo: inv.invoiceNo,
          state: eligibility.state,
          status: "FAILED",
          reason: res.error,
        });
      }
    } catch (err: any) {
      failed++;
      results.push({
        invoiceNo: inv.invoiceNo,
        state: "UNKNOWN",
        status: "FAILED",
        reason: err.message,
      });
    }
  }

  return {
    processed: invoices.length,
    sent,
    skipped,
    failed,
    results,
  };
}

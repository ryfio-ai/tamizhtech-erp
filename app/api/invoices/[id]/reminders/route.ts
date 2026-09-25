import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  sendPaymentReminder,
  getInvoiceReminderHistory,
  evaluateReminderEligibility,
} from "@/lib/reminderService";
import { getCanonicalInvoiceFinancials } from "@/lib/invoiceService";
import { toPaise } from "@/lib/money";

export const revalidate = 0;

/**
 * GET /api/invoices/[id]/reminders
 * Returns real reminder delivery history and current reminder eligibility for this invoice.
 */
export async function GET(
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
        payments: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    const canonical = await getCanonicalInvoiceFinancials(invoice.id);
    const balancePaise = canonical ? toPaise(canonical.outstandingBalance) : invoice.balance;
    const totalPaise = canonical ? toPaise(canonical.totalAmount) : invoice.total;
    const paidPaise = canonical ? toPaise(canonical.netPaidAmount) : invoice.paidAmount;

    const eligibility = evaluateReminderEligibility({
      status: invoice.status,
      dueDate: invoice.dueDate,
      balance: balancePaise,
      total: totalPaise,
      paidAmount: paidPaise,
      client: invoice.client,
      clientName: invoice.clientName,
    });

    const history = await getInvoiceReminderHistory(params.id);

    return NextResponse.json({
      success: true,
      eligibility,
      history,
    });
  } catch (error: any) {
    console.error("GET Reminder History Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/invoices/[id]/reminders
 * Manually dispatches a payment reminder email.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const forceManual = body.forceManual === true;
    const userId = (session.user as any)?.id;

    const result = await sendPaymentReminder({
      invoiceId: params.id,
      forceManual,
      userId,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          state: result.state,
          error: result.error,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      state: result.state,
      messageId: result.messageId,
      skipped: result.skipped,
      reason: result.reason,
    });
  } catch (error: any) {
    console.error("POST Send Reminder Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

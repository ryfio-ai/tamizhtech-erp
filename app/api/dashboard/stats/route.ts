import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { fromPaise } from "@/lib/money";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const [clients, invoices, payments, followups, products, expenses] = await Promise.all([
      prisma.client.findMany({ 
        include: { invoices: true, payments: true },
        orderBy: { createdAt: "desc" }
      }),
      prisma.invoice.findMany({ 
        include: { client: true, items: true },
        orderBy: { createdAt: "desc" }
      }),
      prisma.payment.findMany({
        include: { client: true, invoice: true },
        orderBy: { createdAt: "desc" }
      }),
      prisma.followUp.findMany({ 
        include: { client: true },
        orderBy: { date: "asc" }
      }),
      prisma.product.findMany({
        orderBy: { stockQuantity: "asc" }
      }),
      prisma.expense.findMany({
        orderBy: { createdAt: "desc" }
      }),
    ]);

    const { searchParams } = new URL(req.url);
    const range = (searchParams.get("range") || "today").toLowerCase();
    const customStart = searchParams.get("startDate");
    const customEnd = searchParams.get("endDate");

    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    let rangeLabel = "Today";

    if (range === "7d") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      rangeLabel = "Last 7 Days";
    } else if (range === "30d") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      rangeLabel = "Last 30 Days";
    } else if (range === "6m") {
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 6);
      startDate.setHours(0, 0, 0, 0);
      rangeLabel = "Last 6 Months";
    } else if (range === "1y") {
      startDate = new Date(now);
      startDate.setFullYear(startDate.getFullYear() - 1);
      startDate.setHours(0, 0, 0, 0);
      rangeLabel = "Last 1 Year";
    } else if (range === "custom") {
      if (customStart) {
        startDate = new Date(customStart);
        startDate.setHours(0, 0, 0, 0);
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      }
      if (customEnd) {
        endDate = new Date(customEnd);
        endDate.setHours(23, 59, 59, 999);
      } else {
        endDate = new Date(now);
      }
      rangeLabel = "Custom Range";
    } else {
      // Default: "today" (Daywise)
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      rangeLabel = "Today (Daywise)";
    }

    // 1. Period Bills
    const periodInvoices = invoices.filter(i => {
      const d = new Date(i.date || i.createdAt);
      return d >= startDate && d <= endDate;
    });
    const periodBillsCount = periodInvoices.length;
    const periodBillsAmount = fromPaise(periodInvoices.reduce((sum, i) => sum + (Number(i.total) || 0), 0));

    // 2. Period Payments
    const periodPaymentsList = payments.filter(p => {
      const d = new Date(p.date || p.createdAt);
      return d >= startDate && d <= endDate;
    });
    const periodPaymentsCount = periodPaymentsList.length;
    const periodPaymentsAmount = fromPaise(periodPaymentsList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0));

    // 3. Period Expenses
    const periodExpensesList = expenses.filter(e => {
      if (e.status === "REJECTED") return false;
      const d = new Date(e.date || e.createdAt);
      return d >= startDate && d <= endDate;
    });
    const periodExpensesCount = periodExpensesList.length;
    const periodExpensesAmount = fromPaise(periodExpensesList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0));

    // Net Cashflow
    const netCashflow = periodPaymentsAmount - periodExpensesAmount;

    // 4. Outstanding Balance across all invoices
    const totalOutstandingBalance = fromPaise(invoices.reduce((sum, i) => sum + (Number(i.balance) || 0), 0));

    // 5. Low Stock Products
    const physicalProducts = products.filter(p => p.type === "PHYSICAL_PRODUCT");
    const lowStockProducts = physicalProducts.filter(p => (p.stockQuantity || 0) < (p.minStock || 5));
    const lowStockCount = lowStockProducts.length;

    // 6. Recent Bills (Prefer period bills, fallback to global recent)
    const recentBillsSource = periodInvoices.length > 0 ? periodInvoices : invoices;
    const recentBills = recentBillsSource.slice(0, 5).map(i => ({
      id: i.id,
      invoiceNo: i.invoiceNo,
      clientName: i.client?.name || i.clientName || "Unknown",
      date: i.date.toISOString(),
      total: fromPaise(i.total),
      paidAmount: fromPaise(i.paidAmount),
      balance: fromPaise(i.balance),
      status: i.status,
    }));

    // 7. Recent Customers (Top 5)
    const recentCustomers = clients.slice(0, 5).map(c => ({
      id: c.id,
      clientCode: c.clientCode,
      name: c.name,
      city: c.city,
      phone: c.phone,
      email: c.email,
      outstandingBalance: fromPaise(c.invoices.reduce((sum, inv) => sum + (Number(inv.balance) || 0), 0)),
      status: c.status,
    }));

    // 8. Pending Follow-ups (Top 5 upcoming)
    const upcomingFollowUps = followups
      .filter(f => f.status === "PENDING" && new Date(f.date) >= startDate)
      .slice(0, 5)
      .map(f => ({
        id: f.id,
        date: f.date.toISOString(),
        mode: f.mode,
        notes: f.notes,
        clientName: f.client?.name || "Customer",
      }));

    return NextResponse.json({
      success: true,
      data: {
        range,
        rangeLabel,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        periodBillsCount,
        periodBillsAmount,
        periodPaymentsCount,
        periodPaymentsAmount,
        periodExpensesCount,
        periodExpensesAmount,
        netCashflow,
        totalOutstandingBalance,
        lowStockCount,
        totalProducts: products.length,
        totalCustomers: clients.length,
        recentBills,
        lowStockProducts: lowStockProducts.slice(0, 5),
        recentCustomers,
        upcomingFollowUps,

        // Backwards compatibility aliases
        todayBillsCount: periodBillsCount,
        todayBillsAmount: periodBillsAmount,
        todayPaymentsCount: periodPaymentsCount,
        todayPaymentsAmount: periodPaymentsAmount,
        todayExpensesCount: periodExpensesCount,
        todayExpensesAmount: periodExpensesAmount,
      },
    });
  } catch (error: any) {
    console.error("GET Dashboard Stats Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

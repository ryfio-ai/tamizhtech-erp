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

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Today's Bills
    const todayInvoices = invoices.filter(i => new Date(i.createdAt) >= startOfToday);
    const todayBillsCount = todayInvoices.length;
    const todayBillsAmount = fromPaise(todayInvoices.reduce((sum, i) => sum + (Number(i.total) || 0), 0));

    // 2. Today's Payments
    const todayPaymentsList = payments.filter(p => new Date(p.createdAt) >= startOfToday);
    const todayPaymentsAmount = fromPaise(todayPaymentsList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0));

    // 3. Today's Expenses
    const todayExpensesList = expenses.filter(e => {
      if (e.status === "REJECTED") return false;
      const expDate = new Date(e.date || e.createdAt);
      return expDate >= startOfToday;
    });
    const todayExpensesCount = todayExpensesList.length;
    const todayExpensesAmount = fromPaise(todayExpensesList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0));

    // 3. Outstanding Balance across all invoices
    const totalOutstandingBalance = fromPaise(invoices.reduce((sum, i) => sum + (Number(i.balance) || 0), 0));

    // 4. Low Stock Products
    const physicalProducts = products.filter(p => p.type === "PHYSICAL_PRODUCT");
    const lowStockProducts = physicalProducts.filter(p => (p.stockQuantity || 0) < (p.minStock || 5));
    const lowStockCount = lowStockProducts.length;

    // 5. Recent Bills (Top 5)
    const recentBills = invoices.slice(0, 5).map(i => ({
      id: i.id,
      invoiceNo: i.invoiceNo,
      clientName: i.client?.name || i.clientName || "Unknown",
      date: i.date.toISOString(),
      total: fromPaise(i.total),
      paidAmount: fromPaise(i.paidAmount),
      balance: fromPaise(i.balance),
      status: i.status,
    }));

    // 6. Recent Customers (Top 5)
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

    // 7. Pending Follow-ups (Top 5 upcoming)
    const upcomingFollowUps = followups
      .filter(f => f.status === "PENDING" && new Date(f.date) >= startOfToday)
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
        todayBillsCount,
        todayBillsAmount,
        todayPaymentsCount: todayPaymentsList.length,
        todayPaymentsAmount,
        todayExpensesCount,
        todayExpensesAmount,
        totalOutstandingBalance,
        lowStockCount,
        totalProducts: products.length,
        totalCustomers: clients.length,
        recentBills,
        lowStockProducts: lowStockProducts.slice(0, 5),
        recentCustomers,
        upcomingFollowUps,
      },
    });
  } catch (error: any) {
    console.error("GET Dashboard Stats Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

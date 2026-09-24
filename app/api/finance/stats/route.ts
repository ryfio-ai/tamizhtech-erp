import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { fromPaise } from "@/lib/money";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const [invoices, payments, expenses, accounts] = await Promise.all([
      prisma.invoice.findMany(),
      prisma.payment.findMany(),
      prisma.expense.findMany(),
      prisma.chartOfAccount.findMany(),
    ]);

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const isThisMonth = (d: Date) => {
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    };

    // 1. Revenue & Payment Analysis (ledger stores in exact paise)
    let totalInvoicedAllTimePaise = 0;
    let totalInvoicedThisMonthPaise = 0;
    let totalReceivedAllTimePaise = 0;
    let totalReceivedThisMonthPaise = 0;

    invoices.forEach((inv) => {
      // Exclude cancelled invoices from total billed
      if (inv.status !== "CANCELLED") {
        totalInvoicedAllTimePaise += inv.total;
        if (isThisMonth(inv.date)) {
          totalInvoicedThisMonthPaise += inv.total;
        }
      }
    });

    payments.forEach((p) => {
      if (p.status === "COMPLETED") {
        totalReceivedAllTimePaise += p.amount;
        if (isThisMonth(p.date)) {
          totalReceivedThisMonthPaise += p.amount;
        }
      }
    });

    // 2. Expense Analysis (stored in paise)
    let totalExpensesAllTimePaise = 0;
    let totalExpensesThisMonthPaise = 0;
    const expenseByCategoryPaise: Record<string, number> = {};

    expenses.forEach((exp) => {
      if (exp.status === "APPROVED") {
        totalExpensesAllTimePaise += exp.amount;
        if (isThisMonth(exp.date)) {
          totalExpensesThisMonthPaise += exp.amount;
        }

        expenseByCategoryPaise[exp.category] =
          (expenseByCategoryPaise[exp.category] || 0) + exp.amount;
      }
    });

    // 3. Profit/Loss Analysis
    const netProfitThisMonthPaise = totalReceivedThisMonthPaise - totalExpensesThisMonthPaise;
    const netProfitAllTimePaise = totalReceivedAllTimePaise - totalExpensesAllTimePaise;

    // 4. Monthly Trend (Last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = d.getMonth();
      const y = d.getFullYear();

      const monthName = d.toLocaleString("default", { month: "short" });

      const monthInvoicedPaise = invoices
        .filter(
          (inv) =>
            inv.status !== "CANCELLED" &&
            inv.date.getMonth() === m &&
            inv.date.getFullYear() === y
        )
        .reduce((sum, inv) => sum + inv.total, 0);

      const monthExpensesPaise = expenses
        .filter(
          (exp) =>
            exp.status === "APPROVED" &&
            exp.date.getMonth() === m &&
            exp.date.getFullYear() === y
        )
        .reduce((sum, exp) => sum + exp.amount, 0);

      monthlyTrend.push({
        month: monthName,
        revenue: fromPaise(monthInvoicedPaise),
        expenses: fromPaise(monthExpensesPaise),
        profit: fromPaise(monthInvoicedPaise - monthExpensesPaise),
      });
    }

    const stats = {
      summary: {
        totalInvoiced: fromPaise(totalInvoicedAllTimePaise),
        totalInvoicedThisMonth: fromPaise(totalInvoicedThisMonthPaise),
        totalReceived: fromPaise(totalReceivedAllTimePaise),
        totalReceivedThisMonth: fromPaise(totalReceivedThisMonthPaise),
        totalExpenses: fromPaise(totalExpensesAllTimePaise),
        totalExpensesThisMonth: fromPaise(totalExpensesThisMonthPaise),
        netProfitThisMonth: fromPaise(netProfitThisMonthPaise),
        netProfitAllTime: fromPaise(netProfitAllTimePaise),
        totalReceivedThisMonthRaw: fromPaise(totalReceivedThisMonthPaise),
        totalExpensesThisMonthRaw: fromPaise(totalExpensesThisMonthPaise),
      },
      expenseByCategory: Object.entries(expenseByCategoryPaise).map(([name, valPaise]) => ({
        name,
        value: fromPaise(valPaise),
      })),
      monthlyTrend,
      recentExpenses: expenses
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 5)
        .map((e) => ({
          ...e,
          amount: fromPaise(e.amount),
          paidAmount: fromPaise(e.paidAmount),
          date: e.date.toISOString(),
        })),
      chartOfAccounts: accounts.map((a) => ({
        name: a.name,
        code: a.code,
        balance: fromPaise(a.balance),
      })),
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error: any) {
    console.error("Finance Stats Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const [invoices, payments, expenses, accounts] = await Promise.all([
      prisma.invoice.findMany(),
      prisma.payment.findMany(),
      prisma.expense.findMany(),
      prisma.chartOfAccount.findMany()
    ]);

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const isThisMonth = (d: Date) => {
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    };

    // 1. Revenue & Payment Analysis
    let totalInvoicedAllTime = 0;
    let totalInvoicedThisMonth = 0;
    let totalReceivedAllTime = 0;
    let totalReceivedThisMonth = 0;

    invoices.forEach(inv => {
      totalInvoicedAllTime += inv.total;
      if (isThisMonth(inv.date)) {
        totalInvoicedThisMonth += inv.total;
      }
    });

    payments.forEach(p => {
      totalReceivedAllTime += p.amount;
      if (isThisMonth(p.date)) {
        totalReceivedThisMonth += p.amount;
      }
    });

    // 2. Expense Analysis
    let totalExpensesAllTime = 0;
    let totalExpensesThisMonth = 0;
    const expenseByCategory: Record<string, number> = {};

    expenses.forEach(exp => {
      if (exp.status === "APPROVED") {
        totalExpensesAllTime += exp.amount;
        if (isThisMonth(exp.date)) {
          totalExpensesThisMonth += exp.amount;
        }
        
        expenseByCategory[exp.category] = (expenseByCategory[exp.category] || 0) + exp.amount;
      }
    });

    // 3. Profit/Loss Analysis (Simplified)
    const netProfitThisMonth = totalReceivedThisMonth - totalExpensesThisMonth;
    const netProfitAllTime = totalReceivedAllTime - totalExpensesAllTime;

    // 4. Monthly Trend (Last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = d.getMonth();
      const y = d.getFullYear();
      
      const monthName = d.toLocaleString('default', { month: 'short' });
      
      const monthInvoiced = invoices
        .filter(inv => inv.date.getMonth() === m && inv.date.getFullYear() === y)
        .reduce((sum, inv) => sum + inv.total, 0);
        
      const monthExpenses = expenses
        .filter(exp => exp.status === "APPROVED" && exp.date.getMonth() === m && exp.date.getFullYear() === y)
        .reduce((sum, exp) => sum + exp.amount, 0);

      monthlyTrend.push({
        month: monthName,
        revenue: monthInvoiced,
        expenses: monthExpenses,
        profit: monthInvoiced - monthExpenses
      });
    }

    const stats = {
      summary: {
        totalInvoiced: totalInvoicedAllTime,
        totalInvoicedThisMonth,
        totalReceived: totalReceivedAllTime,
        totalReceivedThisMonth,
        totalExpenses: totalExpensesAllTime,
        totalExpensesThisMonth,
        netProfitThisMonth,
        netProfitAllTime,
      },
      expenseByCategory: Object.entries(expenseByCategory).map(([name, value]) => ({ name, value })),
      monthlyTrend,
      recentExpenses: expenses
        .sort((a,b) => b.date.getTime() - a.date.getTime())
        .slice(0, 5)
        .map(e => ({
           ...e,
           date: e.date.toISOString()
        })),
      chartOfAccounts: accounts.map(a => ({
        name: a.name,
        code: a.code,
        balance: a.balance
      }))
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error: any) {
    console.error("Finance Stats Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

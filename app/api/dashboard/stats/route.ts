import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { DashboardStats } from "@/types";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const [clients, invoices, payments, followups, employees, products, projects] = await Promise.all([
      prisma.client.findMany({ include: { invoices: true } }),
      prisma.invoice.findMany({ include: { client: true, items: true } }),
      prisma.payment.findMany(),
      prisma.followUp.findMany({ include: { client: true } }),
      prisma.employee.findMany(),
      prisma.product.findMany(),
      prisma.project.findMany()
    ]);

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const isThisMonth = (d: Date) => {
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    };

    const totalActiveClients = clients.filter(c => c.status === "ACTIVE").length;
    const totalClients = clients.length;
    const newClientsThisMonth = clients.filter(c => isThisMonth(c.createdAt)).length;

    let totalRevenueThisMonth = 0;
    let totalRevenueAllTime = 0;
    
    payments.forEach(p => {
      totalRevenueAllTime += p.amount;
      if (isThisMonth(p.date)) {
        totalRevenueThisMonth += p.amount;
      }
    });

    let totalOutstandingBalance = 0;
    let totalOverdueAmount = 0;
    let overdueInvoices = 0;

    const paymentStatusBreakdown = {
      paid: 0, partial: 0, unpaid: 0,
      paidAmount: 0, partialAmount: 0, unpaidAmount: 0
    };

    invoices.forEach(inv => {
      totalOutstandingBalance += inv.balance;
      
      if (inv.status === "PAID") {
        paymentStatusBreakdown.paid++;
        paymentStatusBreakdown.paidAmount += inv.total;
      } else if (inv.status === "PARTIAL") {
        paymentStatusBreakdown.partial++;
        paymentStatusBreakdown.partialAmount += inv.total;
      } else {
        paymentStatusBreakdown.unpaid++;
        paymentStatusBreakdown.unpaidAmount += inv.total;
      }

      const dueDate = new Date(inv.dueDate);
      if (inv.balance > 0 && dueDate < today) {
        totalOverdueAmount += inv.balance;
        overdueInvoices++;
      }
    });

    let pendingFollowUps = 0;
    let overdueFollowUpsCount = 0;

    const upcomingFollowUps = followups
      .filter(f => {
        if (f.status === "DONE") return false;
        const fDate = new Date(f.date);
        if (fDate < today) {
          overdueFollowUpsCount++;
        }
        if (f.status === "PENDING") pendingFollowUps++;
        return fDate >= today;
      })
      .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5)
      .map(f => ({...f, clientName: f.client?.name || "Unknown"}));

    // Compile recent invoices
    const recentInvoices = [...invoices]
      .sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map(i => ({
         ...i, 
         clientName: i.client.name,
         createdAt: i.createdAt.toISOString(),
         date: i.date.toISOString(),
         dueDate: i.dueDate.toISOString()
      }));

    const stats: DashboardStats = {
      totalActiveClients,
      totalRevenueThisMonth,
      totalOutstandingBalance,
      pendingFollowUps,
      overdueFollowUps: overdueFollowUpsCount,
      overdueInvoices,
      monthlyRevenue: [],
      paymentStatusBreakdown,
      recentInvoices: recentInvoices as any,
      upcomingFollowUps: upcomingFollowUps as any,
      totalEmployees: employees.filter(e => e.status === "ACTIVE").length,
      activeProjects: projects.filter(p => p.status === "IN_PROGRESS").length,
      inventoryValue: products.reduce((acc, p) => acc + (p.basePrice * p.stockQuantity), 0)
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error: any) {
    console.error("Dashboard Stats Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

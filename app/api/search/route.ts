import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ success: true, data: [] });
  }

  try {
    const regex = { contains: q, mode: "insensitive" as const };

    // Search across core domains in parallel
    const [clients, invoices, payments, products, projects, submissions, quotations, salesOrders, vendors, purchaseOrders] = await Promise.all([
      prisma.client.findMany({
        where: {
          OR: [{ name: regex }, { clientCode: regex }, { city: regex }, { mobileNormalized: regex }],
        },
        take: 5,
        select: { id: true, name: true, clientCode: true, city: true },
      }),
      prisma.invoice.findMany({
        where: {
          OR: [{ invoiceNo: regex }, { clientName: regex }],
        },
        take: 5,
        select: { id: true, invoiceNo: true, clientName: true, total: true, status: true },
      }),
      prisma.payment.findMany({
        where: {
          OR: [{ paymentNo: regex }, { referenceNo: regex }],
        },
        take: 5,
        select: { id: true, paymentNo: true, amount: true, client: { select: { name: true } } },
      }),
      prisma.product.findMany({
        where: {
          OR: [{ name: regex }, { sku: regex }, { category: regex }],
        },
        take: 5,
        select: { id: true, name: true, sku: true, category: true },
      }),
      prisma.project.findMany({
        where: {
          OR: [{ name: regex }, { projectCode: regex }],
        },
        take: 5,
        select: { id: true, name: true, projectCode: true, status: true },
      }),
      prisma.inboundSubmission.findMany({
        where: {
          OR: [{ submissionNo: regex }, { name: regex }, { email: regex }, { mobile: regex }],
        },
        take: 5,
        select: { id: true, submissionNo: true, name: true, type: true, status: true },
      }),
      prisma.quotation.findMany({
        where: {
          OR: [{ quotationNo: regex }, { client: { name: regex } }],
        },
        take: 5,
        select: { id: true, quotationNo: true, total: true, status: true, client: { select: { name: true } } },
      }),
      prisma.salesOrder.findMany({
        where: {
          OR: [{ orderNo: regex }, { client: { name: regex } }],
        },
        take: 5,
        select: { id: true, orderNo: true, totalAmount: true, status: true, client: { select: { name: true } } },
      }),
      prisma.vendor.findMany({
        where: {
          OR: [{ name: regex }, { vendorCode: regex }, { contactPerson: regex }, { gstin: regex }],
        },
        take: 5,
        select: { id: true, name: true, vendorCode: true, contactPerson: true },
      }),
      prisma.purchaseOrder.findMany({
        where: {
          OR: [{ poNo: regex }, { vendor: { name: regex } }],
        },
        take: 5,
        select: { id: true, poNo: true, totalAmount: true, status: true, vendor: { select: { name: true } } },
      }),
    ]);

    const results = [
      ...salesOrders.map((so) => ({
        id: `so-${so.id}`,
        title: so.orderNo,
        subtitle: `${so.client?.name || "Customer"} • ₹${Math.round(so.totalAmount).toLocaleString("en-IN")} (${so.status})`,
        category: "Order" as const,
        href: `/orders/${so.id}`,
      })),
      ...clients.map((c) => ({
        id: `client-${c.id}`,
        title: c.name,
        subtitle: `${c.clientCode || "Customer"} • ${c.city || "Coimbatore"}`,
        category: "Customer" as const,
        href: `/clients/${c.id}`,
      })),
      ...submissions.map((s) => ({
        id: `sub-${s.id}`,
        title: s.submissionNo,
        subtitle: `${s.name} • ${s.type} (${s.status})`,
        category: "Submission" as const,
        href: `/submissions?id=${s.id}`,
      })),
      ...quotations.map((q) => ({
        id: `qtn-${q.id}`,
        title: q.quotationNo,
        subtitle: `${q.client?.name || "Client"} • ₹${Number(q.total || 0).toLocaleString("en-IN")}`,
        category: "Quotation" as const,
        href: `/quotations/${q.id}`,
      })),
      ...products.map((p) => ({
        id: `prod-${p.id}`,
        title: p.name,
        subtitle: `${p.sku} • ${p.category || "Robotics"}`,
        category: "Product" as const,
        href: `/products`,
      })),
      ...invoices.map((i) => ({
        id: `inv-${i.id}`,
        title: i.invoiceNo,
        subtitle: `${i.clientName} • ₹${Number(i.total || 0).toLocaleString("en-IN")}`,
        category: "Invoice" as const,
        href: `/invoices/${i.id}`,
      })),
      ...payments.map((p) => ({
        id: `pay-${p.id}`,
        title: p.paymentNo || "Payment",
        subtitle: `${p.client?.name || "Customer"} • ₹${Number(p.amount || 0).toLocaleString("en-IN")}`,
        category: "Payment" as const,
        href: `/payments`,
      })),
      ...projects.map((pr) => ({
        id: `proj-${pr.id}`,
        title: pr.name,
        subtitle: `Project • ${pr.status}`,
        category: "Project" as const,
        href: `/projects`,
      })),
      ...vendors.map((v) => ({
        id: `sup-${v.id}`,
        title: v.name,
        subtitle: `${v.vendorCode || "Supplier"} • ${v.contactPerson || "Vendor"}`,
        category: "Supplier" as const,
        href: `/suppliers/${v.id}`,
      })),
      ...purchaseOrders.map((po) => ({
        id: `po-${po.id}`,
        title: po.poNo,
        subtitle: `${po.vendor?.name || "Supplier"} • ₹${Math.round(po.totalAmount).toLocaleString("en-IN")} (${po.status})`,
        category: "Procurement" as const,
        href: `/procurement/${po.id}`,
      })),
    ];


    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error("Global search error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

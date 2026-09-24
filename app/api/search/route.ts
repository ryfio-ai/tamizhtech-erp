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
    const [clients, invoices, payments, products, projects, submissions, quotations] = await Promise.all([
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
          OR: [{ name: regex }],
        },
        take: 5,
        select: { id: true, name: true, status: true },
      }),
      prisma.inboundSubmission.findMany({
        where: {
          OR: [
            { submissionNo: regex },
            { name: regex },
            { email: regex },
            { mobile: regex },
            { company: regex },
          ],
        },
        take: 5,
        select: { id: true, submissionNo: true, name: true, type: true, status: true },
      }),
      prisma.quotation.findMany({
        where: {
          OR: [{ quotationNo: regex }],
        },
        take: 5,
        select: { id: true, quotationNo: true, status: true, total: true, client: { select: { name: true } } },
      }),
    ]);

    const results = [
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
    ];


    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error("Global search error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

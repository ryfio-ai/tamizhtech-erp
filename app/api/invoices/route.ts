import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { InvoiceFormValues, invoiceSchema } from "@/lib/validations";
import { generateInvoiceNo } from "@/lib/sequence";
import { deductStockForIssuedInvoice } from "@/lib/stockService";
import { getAuthoritativeInvoiceFinancials } from "@/lib/invoiceService";
import { z } from "zod";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const invoices = await prisma.invoice.findMany({
      include: { 
        client: true,
        items: {
          include: {
            product: true,
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const formatted = invoices.map(i => ({
      ...i,
      clientName: i.client.name,
      clientPhone: i.client.phone,
      clientEmail: i.client.email,
      clientCity: i.client.city || "",
      createdAt: i.createdAt.toISOString()
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error("GET Invoices Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: InvoiceFormValues = await req.json();
    const validated = invoiceSchema.parse(body);

    // Concurrency-safe atomic invoice number from BusinessSequence
    const invoiceNo = await generateInvoiceNo();

    // Verify client
    const client = await prisma.client.findUnique({ where: { id: validated.clientId } });
    if (!client) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    // Preliminary item totals
    const subtotal = validated.items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.unitPrice)), 0);
    const gstPercent = Number(validated.gstPercent) || 18;
    const gstAmount = subtotal * (gstPercent / 100);
    const discountPercent = Number(validated.discountPercent) || 0;
    const discountAmount = subtotal * (discountPercent / 100);
    const total = Math.max(0, subtotal + gstAmount - discountAmount);

    const initialStatus = (validated.status as any) || "DRAFT";

    const newInvoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        clientId: client.id,
        clientName: client.name,
        date: new Date(validated.date),
        dueDate: new Date(validated.dueDate),
        status: initialStatus,
        subtotal,
        gstPercent,
        gstAmount,
        discountAmount,
        total,
        paidAmount: 0,
        balance: total,
        notes: validated.notes || "Thank you for your business!",
        items: {
          create: validated.items.map(item => ({
            productId: (item as any).productId || null,
            description: item.description,
            qty: Number(item.qty),
            unitPrice: Number(item.unitPrice),
            amount: Number(item.qty) * Number(item.unitPrice),
            configurationNotes: (item as any).configurationNotes?.trim() || null,
          }))
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    // Lock 1: Draft bills do NOT deduct stock. Only ISSUED bills deduct stock.
    if (initialStatus === "ISSUED") {
      await deductStockForIssuedInvoice(newInvoice.id);
    }

    // Authoritative calculation pipeline (Lock 1 from Gate 4)
    await getAuthoritativeInvoiceFinancials(newInvoice.id);

    return NextResponse.json({ success: true, data: newInvoice }, { status: 201 });
  } catch (error: any) {
    console.error("POST Invoice Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

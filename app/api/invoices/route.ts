import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { InvoiceFormValues, invoiceSchema } from "@/lib/validations";
import { generateInvoiceNo } from "@/lib/sequence";
import { deductStockForIssuedInvoice } from "@/lib/stockService";
import { getAuthoritativeInvoiceFinancials } from "@/lib/invoiceService";
import { toPaise, fromPaise, roundToPaise } from "@/lib/money";
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
      subtotal: fromPaise(i.subtotal),
      gstAmount: fromPaise(i.gstAmount),
      discountAmount: fromPaise(i.discountAmount),
      total: fromPaise(i.total),
      paidAmount: fromPaise(i.paidAmount),
      balance: fromPaise(i.balance),
      items: i.items.map(item => ({
        ...item,
        unitPrice: fromPaise(item.unitPrice),
        amount: fromPaise(item.amount),
      })),
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

    // Exact paise item totals
    const processedItems = validated.items.map(item => {
      const qty = Math.max(1, Math.round(Number(item.qty) || 1));
      const unitPricePaise = toPaise(Number(item.unitPrice) || 0);
      const amountPaise = roundToPaise(qty * unitPricePaise);
      return {
        productId: (item as any).productId || null,
        description: item.description,
        qty,
        unitPrice: unitPricePaise,
        amount: amountPaise,
        configurationNotes: (item as any).configurationNotes?.trim() || null,
      };
    });

    const subtotalPaise = processedItems.reduce((sum, it) => sum + it.amount, 0);
    const gstPercent = Number(validated.gstPercent) || 18;
    const discountPercent = Number(validated.discountPercent) || 0;
    const discountAmountPaise = roundToPaise(subtotalPaise * (discountPercent / 100));
    const taxablePaise = Math.max(0, subtotalPaise - discountAmountPaise);
    const gstAmountPaise = roundToPaise(taxablePaise * (gstPercent / 100));
    const totalPaise = Math.max(0, taxablePaise + gstAmountPaise);

    const initialStatus = (validated.status as any) || "DRAFT";

    const newInvoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        clientId: client.id,
        clientName: client.name,
        date: new Date(validated.date),
        dueDate: new Date(validated.dueDate),
        status: initialStatus,
        issuedAt: initialStatus === "ISSUED" ? new Date() : null,
        subtotal: subtotalPaise,
        gstPercent,
        gstAmount: gstAmountPaise,
        discountAmount: discountAmountPaise,
        total: totalPaise,
        paidAmount: 0,
        balance: totalPaise,
        notes: validated.notes || "Thank you for your business!",
        items: {
          create: processedItems,
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

    // Authoritative calculation pipeline
    const financials = await getAuthoritativeInvoiceFinancials(newInvoice.id);

    const responseData = {
      ...newInvoice,
      subtotal: fromPaise(newInvoice.subtotal),
      gstAmount: fromPaise(newInvoice.gstAmount),
      discountAmount: fromPaise(newInvoice.discountAmount),
      total: fromPaise(newInvoice.total),
      paidAmount: fromPaise(newInvoice.paidAmount),
      balance: fromPaise(newInvoice.balance),
      financials,
    };

    return NextResponse.json({ success: true, data: responseData }, { status: 201 });
  } catch (error: any) {
    console.error("POST Invoice Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

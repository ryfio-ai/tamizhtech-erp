import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { InvoiceFormValues, invoiceSchema } from "@/lib/validations";
import { z } from "zod";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const invoices = await prisma.invoice.findMany({
      include: { 
        client: true,
        items: true
      },
      orderBy: { createdAt: 'desc' }
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

    // Auto-generate invoice number (TT-INV-XXXX)
    const count = await prisma.invoice.count();
    const invoiceNo = `TT-INV-${(count + 1).toString().padStart(6, '0')}`;

    // Get client
    const client = await prisma.client.findUnique({ where: { id: validated.clientId } });
    if (!client) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 });
    }

    // Calculate totals based on items
    const subtotal = validated.items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
    const gstAmount = subtotal * 0.18; // Default 18% GST for TamizhTech
    const total = subtotal + gstAmount;

    const newInvoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        clientId: client.id,
        clientName: client.name,
        date: new Date(validated.date),
        dueDate: new Date(validated.dueDate),
        status: validated.status || "DRAFT",
        subtotal,
        gstAmount,
        total,
        paidAmount: 0,
        balance: total,
        items: {
          create: validated.items.map(item => ({
            description: item.description,
            qty: item.qty,
            unitPrice: item.unitPrice,
            amount: item.qty * item.unitPrice
          }))
        }
      },
      include: {
        items: true
      }
    });

    return NextResponse.json({ success: true, data: newInvoice }, { status: 201 });
  } catch (error: any) {
    console.error("POST Invoice Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

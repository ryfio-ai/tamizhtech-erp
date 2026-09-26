import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { InvoiceFormValues, invoiceSchema } from "@/lib/validations";
import { allocateInvoiceNoTx, generateDraftInvoiceNo } from "@/lib/sequence";
import { deductStockForIssuedInvoice } from "@/lib/stockService";
import { getAuthoritativeInvoiceFinancials } from "@/lib/invoiceService";
import { toPaise, fromPaise, roundToPaise } from "@/lib/money";
import { requireAuth } from "@/lib/rbac";
import { z } from "zod";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth("invoice.read");
    if (!auth.success) {
      return auth.response;
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status")?.trim();
    const clientId = searchParams.get("clientId")?.trim();
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    const where: any = {};
    if (clientId) {
      where.clientId = clientId;
    }
    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "").trim();
      where.OR = [
        { invoiceNo: { contains: safeSearch || search, mode: "insensitive" } },
        { client: { name: { contains: safeSearch || search, mode: "insensitive" } } },
        { client: { company: { contains: safeSearch || search, mode: "insensitive" } } },
        { client: { phone: { contains: safeSearch || search } } },
      ];
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: { 
        client: true,
        items: {
          include: {
            product: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
      ...(limitParam ? { take: Math.max(1, Math.min(500, parseInt(limitParam, 10) || 50)) } : {}),
      ...(offsetParam ? { skip: Math.max(0, parseInt(offsetParam, 10) || 0) } : {}),
    });

    const shippingMap = new Map<string, number>();
    if (invoices.length > 0) {
      try {
        const client = await clientPromise;
        const invoiceIds = invoices.map(i => new ObjectId(i.id));
        const rawInvoices = await client.db().collection("Invoice").find(
          { _id: { $in: invoiceIds } },
          { projection: { _id: 1, shippingCharge: 1, shippingAmount: 1 } }
        ).toArray();

        for (const raw of rawInvoices) {
          if (raw.shippingCharge !== undefined && raw.shippingCharge !== null) {
            shippingMap.set(raw._id.toString(), fromPaise(Number(raw.shippingCharge) || 0));
          } else if (raw.shippingAmount !== undefined && raw.shippingAmount !== null) {
            shippingMap.set(raw._id.toString(), Number(raw.shippingAmount) || 0);
          }
        }
      } catch (err) {
        console.warn("Could not batch load shipping charges from MongoDB:", err);
      }
    }

    const formatted = invoices.map(i => ({
      ...i,
      subtotal: fromPaise(i.subtotal),
      gstAmount: fromPaise(i.gstAmount),
      discountAmount: fromPaise(i.discountAmount),
      shippingCharge: shippingMap.get(i.id) || 0,
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
    const auth = await requireAuth("invoice.create");
    if (!auth.success) {
      return auth.response;
    }

    const body: InvoiceFormValues = await req.json();
    const validated = invoiceSchema.parse(body);

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

    const shippingChargeRupees = Math.max(0, Number(validated.shippingCharge) || 0);
    const shippingChargePaise = toPaise(shippingChargeRupees);

    const subtotalPaise = processedItems.reduce((sum, it) => sum + it.amount, 0);
    const gstPercent = validated.gstPercent !== undefined && validated.gstPercent !== null && String(validated.gstPercent).trim() !== "" ? Number(validated.gstPercent) : 18;
    const discountPercent = Number(validated.discountPercent) || 0;
    const discountAmountPaise = roundToPaise(subtotalPaise * (discountPercent / 100));
    const taxablePaise = Math.max(0, subtotalPaise - discountAmountPaise);
    const gstAmountPaise = roundToPaise(taxablePaise * (gstPercent / 100));
    const totalPaise = Math.max(0, taxablePaise + gstAmountPaise + shippingChargePaise);

    const initialStatus = (validated.status as any) || "DRAFT";

    // Transaction-safe atomic creation & sequence allocation
    const newInvoice = await prisma.$transaction(async (tx) => {
      let invoiceNo: string;
      if (initialStatus === "ISSUED") {
        invoiceNo = await allocateInvoiceNoTx(tx);
      } else {
        invoiceNo = generateDraftInvoiceNo();
      }

      return tx.invoice.create({
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
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });

    // Persist shipping charge directly in MongoDB Invoice document
    if (shippingChargePaise > 0) {
      try {
        const client = await clientPromise;
        await client.db().collection("Invoice").updateOne(
          { _id: new ObjectId(newInvoice.id) },
          { $set: { shippingCharge: shippingChargePaise } }
        );
      } catch (err) {
        console.warn("Failed to set shippingCharge in MongoDB:", err);
      }
    }

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
      shippingCharge: shippingChargeRupees,
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

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ClientFormValues, clientSchema } from "@/lib/validations";
import { ApiResponse } from "@/types";
import { allocateClientCodeTx } from "@/lib/sequence";
import { normalizeMobile } from "@/lib/phone";
import { z } from "zod";

export const revalidate = 0; // Disable static caching for API

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("search") || searchParams.get("q") || "").trim();

    let whereClause: any = {};
    if (query) {
      const normQuery = normalizeMobile(query);
      const digitsOnly = query.replace(/\D/g, "");
      const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "").trim();

      const conditions: any[] = [
        { name: { contains: safeQuery || query, mode: "insensitive" } },
        { email: { contains: safeQuery || query, mode: "insensitive" } },
        { company: { contains: safeQuery || query, mode: "insensitive" } },
      ];

      if (normQuery) {
        conditions.push({ mobileNormalized: normQuery });
      }
      if (digitsOnly && digitsOnly.length >= 4) {
        conditions.push({ mobileNormalized: { contains: digitsOnly } });
        conditions.push({ phone: { contains: digitsOnly } });
      }
      if (safeQuery) {
        conditions.push({ phone: { contains: safeQuery } });
      }

      whereClause = {
        OR: conditions,
      };
    }

    const clients = await prisma.client.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        invoices: {
          select: { total: true, balance: true },
        },
        payments: {
          select: { amount: true },
        },
      },
    });

    // Map to the expected UI Client type
    const formattedClients = clients.map((c) => ({
      ...c,
      totalInvoiced: c.invoices.reduce((sum, inv) => sum + inv.total, 0),
      totalPaid: c.payments.reduce((sum, pay) => sum + pay.amount, 0),
      outstandingBalance: c.invoices.reduce((sum, inv) => sum + inv.balance, 0),
      createdAt: c.createdAt.toISOString(),
    }));

    return NextResponse.json<ApiResponse<any[]>>(
      { success: true, data: formattedClients },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error: any) {
    console.error("GET Clients Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: ClientFormValues = await req.json();
    const validated = clientSchema.parse(body);

    const mobileNormalized = normalizeMobile(validated.phone);
    if (!mobileNormalized) {
      return NextResponse.json(
        { success: false, error: "A valid mobile / WhatsApp number is required." },
        { status: 400 }
      );
    }

    // 1. Primary backend duplicate check by normalized mobile
    const existing = await prisma.client.findUnique({
      where: { mobileNormalized },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer already exists with this mobile number.",
          code: "DUPLICATE_MOBILE",
          existingClient: {
            id: existing.id,
            clientCode: existing.clientCode,
            name: existing.name,
            phone: existing.phone,
          },
        },
        { status: 409 }
      );
    }

    // 2. Concurrency-safe atomic Client Code allocation & creation inside transaction
    try {
      const newClient = await prisma.$transaction(async (tx) => {
        const clientCode = await allocateClientCodeTx(tx);
        return tx.client.create({
          data: {
            clientCode,
            name: validated.name.trim(),
            phone: validated.phone.trim(),
            mobileNormalized,
            email: validated.email ? validated.email.trim().toLowerCase() : null,
            company: validated.company ? validated.company.trim() : null,
            city: validated.city ? validated.city.trim() : null,
            address: validated.address ? validated.address.trim() : null,
            state: validated.state ? validated.state.trim() : null,
            pincode: validated.pincode ? validated.pincode.trim() : null,
            gstin: validated.gstin ? validated.gstin.trim().toUpperCase() : null,
            serviceType: validated.serviceType || null,
            source: validated.source || "OTHER",
            status: validated.status || "LEAD",
            type: validated.type || "INDIVIDUAL",
            notes: validated.notes ? validated.notes.trim() : null,
            assignedToId: validated.assignedToId || null,
          },
        });
      });

      return NextResponse.json<ApiResponse<any>>(
        { success: true, data: { ...newClient, createdAt: newClient.createdAt.toISOString() } },
        { status: 201 }
      );
    } catch (createErr: any) {
      // 4. Handle concurrent duplicate-key race condition (MongoDB E11000 / Prisma P2002)
      if (
        createErr.code === "P2002" ||
        createErr.code === 11000 ||
        String(createErr.message).includes("mobileNormalized")
      ) {
        const raceExisting = await prisma.client.findUnique({ where: { mobileNormalized } });
        return NextResponse.json(
          {
            success: false,
            error: "Customer already exists with this mobile number.",
            code: "DUPLICATE_MOBILE",
            existingClient: raceExisting
              ? {
                  id: raceExisting.id,
                  clientCode: raceExisting.clientCode,
                  name: raceExisting.name,
                  phone: raceExisting.phone,
                }
              : null,
          },
          { status: 409 }
        );
      }
      throw createErr;
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

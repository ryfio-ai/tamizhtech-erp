import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ClientFormValues, clientSchema } from "@/lib/validations";
import { ApiResponse, Client } from "@/types";
import { z } from "zod";

export const revalidate = 0; // Disable static caching for API

export async function GET(req: NextRequest) {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
      include: { 
        invoices: true, 
        payments: true, 
        followUps: true,
        applications: true,
        projects: true
      }
    });
    
    // Map to the expected UI Client type
    const formattedClients = clients.map(c => ({
      ...c,
      totalInvoiced: c.invoices.reduce((sum, inv) => sum + inv.total, 0),
      totalPaid: c.payments.reduce((sum, pay) => sum + pay.amount, 0),
      outstandingBalance: c.invoices.reduce((sum, inv) => sum + inv.balance, 0),
      createdAt: c.createdAt.toISOString()
    }));

    return NextResponse.json<ApiResponse<any[]>>({ success: true, data: formattedClients });
  } catch (error: any) {
    console.error("GET Clients Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: ClientFormValues = await req.json();
    const validated = clientSchema.parse(body);
    
    // Check duplicates
    const duplicate = await prisma.client.findFirst({
      where: {
        OR: [
          { email: validated.email },
          { phone: validated.phone }
        ]
      }
    });

    if (duplicate) {
      return NextResponse.json({ success: false, error: "Client with this email or phone already exists" }, { status: 400 });
    }

    // Generate Client Code: TT-CL-YYYYMM-XXXX
    const count = await prisma.client.count();
    const clientCode = `TT-CL-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${(count + 1).toString().padStart(4, '0')}`;

    const newClient = await prisma.client.create({
      data: {
        clientCode,
        name: validated.name,
        phone: validated.phone,
        email: validated.email,
        city: validated.city || "",
        serviceType: validated.serviceType || "",
        source: validated.source || "OTHER",
        status: validated.status || "LEAD",
        type: validated.type || "INDIVIDUAL",
        assignedToId: validated.assignedToId
      }
    });
    
    return NextResponse.json<ApiResponse<any>>({ success: true, data: { ...newClient, createdAt: newClient.createdAt.toISOString() } }, { status: 201 });
    
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizeMobile, isValidMobile } from "@/lib/phone";
import { generateClientCode } from "@/lib/sequence";

export const revalidate = 0;

/**
 * Idempotent Lead -> Customer Conversion API
 * Flow:
 * 1. Read lead by leadId (or payload name/phone).
 * 2. Validate and normalize mobile.
 * 3. Search existing Client with mobileNormalized.
 * 4. If existing found: link lead, mark lead status CONVERTED, return existing client (no duplicate).
 * 5. If not found: atomically create new Client, link lead, return new client.
 * 6. Concurrency safe: Catches P2002/11000 race condition and links to existing client safely.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadId, name, phone, email, company, city, notes } = body;

    let lead: any = null;
    if (leadId) {
      lead = await prisma.lead.findUnique({ where: { id: leadId } });
    }

    const targetName = (name || lead?.name || "").trim();
    const targetPhone = (phone || lead?.phone || "").trim();
    const targetEmail = (email || lead?.email || "").trim() || null;
    const targetNotes = (notes || lead?.notes || "").trim() || null;

    if (!targetName || targetName.length < 2) {
      return NextResponse.json(
        { success: false, error: "Customer name must be at least 2 characters." },
        { status: 400 }
      );
    }

    if (!targetPhone || !isValidMobile(targetPhone)) {
      return NextResponse.json(
        { success: false, error: "A valid mobile / WhatsApp number is required for conversion." },
        { status: 400 }
      );
    }

    const mobileNormalized = normalizeMobile(targetPhone);

    // 1. Check if customer already exists with this normalized mobile
    let client = await prisma.client.findUnique({
      where: { mobileNormalized },
    });

    let isNew = false;

    // 2. If not found, create new customer atomically
    if (!client) {
      let clientCode: string;
      try {
        clientCode = await generateClientCode();
      } catch {
        clientCode = `TT-CL-${Date.now().toString().slice(-4)}`;
      }

      try {
        client = await prisma.client.create({
          data: {
            clientCode,
            name: targetName,
            phone: targetPhone,
            mobileNormalized,
            email: targetEmail ? targetEmail.toLowerCase() : null,
            company: company ? company.trim() : null,
            city: city ? city.trim() : null,
            notes: targetNotes,
            status: "ACTIVE",
            type: "INDIVIDUAL",
            source: lead ? `Lead Conversion (${lead.leadCode})` : "Lead Conversion",
          },
        });
        isNew = true;
      } catch (err: any) {
        // Handle concurrent race condition (another request created same customer simultaneously)
        if (err.code === "P2002" || err.code === 11000 || String(err.message).includes("mobileNormalized")) {
          client = await prisma.client.findUnique({ where: { mobileNormalized } });
          isNew = false;
        } else {
          throw err;
        }
      }
    }

    // 3. Link lead if leadId provided
    if (lead && client) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: "CONVERTED",
          notes: lead.notes ? `${lead.notes}\n[CONVERTED to Customer ${client.clientCode}]` : `[CONVERTED to Customer ${client.clientCode}]`,
        },
      }).catch((e) => console.warn("[LEAD_CONVERT] Could not update lead status:", e));
    }

    return NextResponse.json({
      success: true,
      data: {
        client,
      },
      isNew,
      isExisting: !isNew,
      message: isNew ? "Customer created and lead converted successfully" : "Lead linked to existing customer record",
    });
  } catch (error: any) {
    console.error("Lead conversion error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

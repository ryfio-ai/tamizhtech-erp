import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { deductStockForIssuedInvoice, reverseStockForCancelledInvoice } from "@/lib/stockService";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { status } = body;

    const allowedStatuses = ["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "CANCELLED"];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: `Invalid status. Allowed: ${allowedStatuses.join(", ")}` }, { status: 400 });
    }

    const currentInvoice = await prisma.invoice.findUnique({
      where: { id: params.id },
    });

    if (!currentInvoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    // Lock 1: Status transitions and stock lifecycle
    if (status === "ISSUED" && currentInvoice.status === "DRAFT") {
      // Transitioning from DRAFT to ISSUED -> deduct stock
      await deductStockForIssuedInvoice(params.id);
    } else if (status === "CANCELLED" && currentInvoice.status !== "DRAFT") {
      // Cancelling an issued/paid bill -> reverse stock
      await reverseStockForCancelledInvoice(params.id);
    }

    const updated = await prisma.invoice.update({
      where: { id: params.id },
      data: { status: status as any },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Update Invoice Status Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

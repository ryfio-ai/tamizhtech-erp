import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { allocateInvoiceNoTx } from "@/lib/sequence";
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

    // Atomic status transition and sequence allocation
    const updated = await prisma.$transaction(async (tx) => {
      const updateData: any = { status: status as any };

      // When transitioning to ISSUED (or subsequent non-draft state) from DRAFT, allocate official sequence number
      if (status !== "DRAFT" && status !== "CANCELLED" && currentInvoice.invoiceNo.startsWith("DRAFT-")) {
        const officialNo = await allocateInvoiceNoTx(tx);
        updateData.invoiceNo = officialNo;
        updateData.issuedAt = new Date();
      }

      return tx.invoice.update({
        where: { id: params.id },
        data: updateData,
      });
    });

    // Stock movement on status lifecycle
    if (status === "ISSUED" && currentInvoice.status === "DRAFT") {
      // Transitioning from DRAFT to ISSUED -> deduct stock
      await deductStockForIssuedInvoice(params.id);
    } else if (status === "CANCELLED" && currentInvoice.status !== "DRAFT") {
      // Cancelling an issued/paid bill -> reverse stock; retain official invoiceNo permanently
      await reverseStockForCancelledInvoice(params.id);
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Update Invoice Status Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

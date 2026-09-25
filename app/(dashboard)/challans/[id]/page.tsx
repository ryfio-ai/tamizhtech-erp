import React from "react";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDeliveryChallanById } from "@/lib/challanService";
import { DeliveryChallanView } from "@/components/challans/DeliveryChallanView";

export const dynamic = "force-dynamic";

export default async function ChallanDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return notFound();
  }

  const challan = await getDeliveryChallanById(params.id);
  if (!challan) {
    return notFound();
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <DeliveryChallanView challan={challan} client={challan.client} />
    </div>
  );
}

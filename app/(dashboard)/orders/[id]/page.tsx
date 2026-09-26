import React from "react";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSalesOrderById, getOrderTraceabilityTimeline } from "@/lib/salesOrderService";
import { SalesOrderDetailView } from "@/components/orders/SalesOrderDetailView";

export const revalidate = 0;

interface PageProps {
  params: {
    id: string;
  };
}

export default async function SalesOrderDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const order = await getSalesOrderById(params.id);
  if (!order) {
    notFound();
  }

  const timeline = await getOrderTraceabilityTimeline(params.id);
  const userRole = (session.user as any).role || "ADMIN";

  return <SalesOrderDetailView order={{ ...order, timeline }} userRole={userRole} />;
}

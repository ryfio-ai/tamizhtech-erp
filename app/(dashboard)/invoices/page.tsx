import React, { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/app/get-query-client";
import { InvoicesClientView } from "./InvoicesClientView";
import { queryKeys } from "@/lib/queryKeys";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { fromPaise } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { search?: string; status?: string; client?: string };
}) {
  const queryClient = getQueryClient();
  const session = await getServerSession(authOptions);

  const filters = {
    search: searchParams?.search,
    status: searchParams?.status,
    clientId: searchParams?.client,
    limit: 50,
  };

  // Server prefetch if session is authenticated (eliminates request waterfalls)
  if (session?.user) {
    try {
      await queryClient.prefetchQuery({
        queryKey: queryKeys.invoices.list(filters),
        queryFn: async () => {
          const where: any = {};
          if (filters.clientId) where.clientId = filters.clientId;
          if (filters.status && filters.status !== "ALL") where.status = filters.status;
          if (filters.search) {
            const safe = filters.search.replace(/[.*+?^${}()|[\]\\]/g, "").trim();
            where.OR = [
              { invoiceNo: { contains: safe, mode: "insensitive" } },
              { client: { name: { contains: safe, mode: "insensitive" } } },
            ];
          }

          const invoices = await prisma.invoice.findMany({
            where,
            include: {
              client: true,
              items: {
                include: { product: true },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
          });

          return JSON.parse(
            JSON.stringify(
              invoices.map((i) => ({
                ...i,
                subtotal: fromPaise(i.subtotal),
                gstAmount: fromPaise(i.gstAmount),
                discountAmount: fromPaise(i.discountAmount),
                total: fromPaise(i.total),
                paidAmount: fromPaise(i.paidAmount),
                balance: fromPaise(i.balance),
                date: i.issuedAt,
                clientName: i.client.name,
                clientPhone: i.client.phone,
                clientEmail: i.client.email,
                clientCity: i.client.city || "",
                createdAt: i.createdAt.toISOString(),
                items: i.items.map((item) => ({
                  ...item,
                  unitPrice: fromPaise(item.unitPrice),
                  amount: fromPaise(item.amount),
                })),
              }))
            )
          );
        },
      });
    } catch (e) {
      console.error("Error prefetching invoices on server:", e);
    }
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<LoadingSkeleton type="table" />}>
        <InvoicesClientView initialFilters={filters} />
      </Suspense>
    </HydrationBoundary>
  );
}

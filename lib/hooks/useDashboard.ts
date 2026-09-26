import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/queryKeys";

export type DashboardPeriod = "today" | "7d" | "30d" | "6m" | "1y" | "custom";

export interface DashboardFilterParams {
  range?: DashboardPeriod;
  startDate?: string;
  endDate?: string;
}

export interface DashboardStats {
  range: string;
  rangeLabel: string;
  startDate: string;
  endDate: string;
  periodBillsCount: number;
  periodBillsAmount: number;
  periodPaymentsCount: number;
  periodPaymentsAmount: number;
  periodExpensesCount: number;
  periodExpensesAmount: number;
  netCashflow: number;
  totalOutstandingBalance: number;
  lowStockCount: number;
  totalProducts: number;
  totalCustomers: number;
  recentBills: any[];
  lowStockProducts: any[];
  recentCustomers: any[];
  upcomingFollowUps: any[];

  // Compatibility fields
  todayBillsCount: number;
  todayBillsAmount: number;
  todayPaymentsCount: number;
  todayPaymentsAmount: number;
  todayExpensesCount: number;
  todayExpensesAmount: number;
}

export function useDashboardStats(filters?: DashboardFilterParams) {
  const queryParams = new URLSearchParams();
  if (filters?.range) queryParams.set("range", filters.range);
  if (filters?.startDate) queryParams.set("startDate", filters.startDate);
  if (filters?.endDate) queryParams.set("endDate", filters.endDate);

  const queryStr = queryParams.toString();
  const endpoint = `/api/dashboard/stats${queryStr ? `?${queryStr}` : ""}`;

  return useQuery({
    queryKey: queryKeys.dashboard.metrics(filters),
    queryFn: () => api.get<DashboardStats>(endpoint),
    staleTime: 30 * 1000, // 30s operational freshness
    refetchInterval: 60 * 1000, // Background refresh every 60s
  });
}

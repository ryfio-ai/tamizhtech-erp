import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { invoicesApi, Invoice, InvoiceListFilters } from "@/lib/api/invoices";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";

/**
 * Query hook for paginated & filtered Invoices list.
 * Uses keepPreviousData to ensure seamless table pagination without UI flickering.
 */
export function useInvoices(filters: InvoiceListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.invoices.list(filters),
    queryFn: () => invoicesApi.list(filters),
    placeholderData: keepPreviousData,
    staleTime: 45 * 1000, // 45 seconds operational stale time
  });
}

/**
 * Query hook for single invoice details.
 */
export function useInvoice(id: string) {
  return useQuery({
    queryKey: queryKeys.invoices.detail(id),
    queryFn: () => invoicesApi.getById(id),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  });
}

/**
 * Mutation hook for creating an invoice.
 * Atomically invalidates invoice lists, customer balance summaries, and dashboard metrics.
 */
export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => invoicesApi.create(data),
    onSuccess: (newInvoice) => {
      // Invalidate relevant query caches (Section 18 & 40)
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() });
      if (newInvoice.clientId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.clients.financialSummary(newInvoice.clientId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.clients.detail(newInvoice.clientId),
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });

      toast.success("Invoice created successfully", {
        description: `Invoice No: ${newInvoice.invoiceNo}`,
      });
    },
    onError: (error: ApiError | any) => {
      toast.error(error?.message || "Failed to create invoice");
    },
  });
}

/**
 * Mutation hook for updating an existing invoice.
 */
export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      invoicesApi.update(id, data),
    onSuccess: (updatedInvoice) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(updatedInvoice.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() });
      if (updatedInvoice.clientId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.clients.financialSummary(updatedInvoice.clientId),
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });

      toast.success("Invoice updated successfully", {
        description: `Invoice No: ${updatedInvoice.invoiceNo}`,
      });
    },
    onError: (error: ApiError | any) => {
      toast.error(error?.message || "Failed to update invoice");
    },
  });
}

/**
 * Mutation hook for cancelling an invoice.
 */
export function useCancelInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      invoicesApi.cancel(id, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });

      toast.success("Invoice cancelled successfully");
    },
    onError: (error: ApiError | any) => {
      toast.error(error?.message || "Failed to cancel invoice");
    },
  });
}

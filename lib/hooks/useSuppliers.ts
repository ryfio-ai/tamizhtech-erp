import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { suppliersApi, Supplier, SupplierListFilters } from "@/lib/api/suppliers";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";

export function useSuppliers(filters: SupplierListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.suppliers.list(filters),
    queryFn: () => suppliersApi.list(filters),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: queryKeys.suppliers.detail(id),
    queryFn: () => suppliersApi.getById(id),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => suppliersApi.create(data),
    onSuccess: (newSupplier: any) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.lists() });
      toast.success("Supplier registered successfully", {
        description: `${newSupplier.legalName || newSupplier.name} (${newSupplier.supplierCode || "Saved"})`,
      });
    },
    onError: (error: ApiError | any) => {
      toast.error(error?.message || "Failed to create supplier");
    },
  });
}

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { productsApi, Product, ProductListFilters } from "@/lib/api/products";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";

export function useProducts(filters: ProductListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: () => productsApi.list(filters),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000, // 30 seconds for inventory
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => productsApi.getById(id),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => productsApi.create(data),
    onSuccess: (newProduct) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success("Product created successfully", {
        description: `${newProduct.name} (${newProduct.sku})`,
      });
    },
    onError: (error: ApiError | any) => {
      toast.error(error?.message || "Failed to create product");
    },
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { productId: string; quantityChange: number; type: string; notes?: string }) =>
      productsApi.adjustStock(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(variables.productId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success("Stock adjustment recorded in ledger");
    },
    onError: (error: ApiError | any) => {
      toast.error(error?.message || "Failed to adjust stock");
    },
  });
}

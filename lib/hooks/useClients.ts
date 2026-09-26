import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { clientsApi, Client, ClientListFilters } from "@/lib/api/clients";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";

export function useClients(filters: ClientListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.clients.list(filters),
    queryFn: () => clientsApi.list(filters),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: queryKeys.clients.detail(id),
    queryFn: () => clientsApi.getById(id),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => clientsApi.create(data),
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success("Client added successfully", {
        description: `${newClient.name} (${newClient.clientCode || "Created"})`,
      });
    },
    onError: (error: ApiError | any) => {
      toast.error(error?.message || "Failed to create client");
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      clientsApi.update(id, data),
    onSuccess: (updatedClient) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(updatedClient.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.lists() });
      toast.success("Client profile updated successfully");
    },
    onError: (error: ApiError | any) => {
      toast.error(error?.message || "Failed to update client");
    },
  });
}

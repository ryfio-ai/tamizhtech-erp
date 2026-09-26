import { api } from "./client";

export interface ClientContact {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  type: string;
}

export interface Client {
  id: string;
  clientCode: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  gstin?: string | null;
  status: string;
  billingAddress?: string | null;
  contacts?: ClientContact[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    invoices: number;
    quotations: number;
    orders: number;
  };
}

export interface ClientListFilters {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export const clientsApi = {
  list: async (filters: ClientListFilters = {}): Promise<Client[]> => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.status && filters.status !== "ALL") params.set("status", filters.status);
    if (filters.limit) params.set("limit", String(filters.limit));
    if (filters.offset) params.set("offset", String(filters.offset));

    const queryStr = params.toString();
    const endpoint = `/api/clients${queryStr ? `?${queryStr}` : ""}`;
    return api.get<Client[]>(endpoint);
  },

  getById: async (id: string): Promise<Client> => {
    return api.get<Client>(`/api/clients/${id}`);
  },

  create: async (data: any): Promise<Client> => {
    return api.post<Client>("/api/clients", data);
  },

  update: async (id: string, data: any): Promise<Client> => {
    return api.patch<Client>(`/api/clients/${id}`, data);
  },
};

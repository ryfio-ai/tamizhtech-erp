import { api } from "./client";

export interface Supplier {
  id: string;
  vendorCode: string;
  supplierCode?: string;
  name: string;
  legalName?: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  gstin?: string | null;
  pan?: string | null;
  billingAddress?: string | null;
  paymentTerms?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierListFilters {
  search?: string;
  status?: string;
  limit?: number;
  skip?: number;
}

export const suppliersApi = {
  list: async (filters: SupplierListFilters = {}): Promise<Supplier[]> => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.status && filters.status !== "ALL") params.set("status", filters.status);
    if (filters.limit) params.set("limit", String(filters.limit));
    if (filters.skip) params.set("skip", String(filters.skip));

    const queryStr = params.toString();
    const endpoint = `/api/suppliers${queryStr ? `?${queryStr}` : ""}`;
    const res = await api.get<any>(endpoint);
    // Safe extraction handling array or wrapped object
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.suppliers)) return res.suppliers;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  },

  getById: async (id: string): Promise<Supplier> => {
    return api.get<Supplier>(`/api/suppliers/${id}`);
  },

  create: async (data: any): Promise<Supplier> => {
    return api.post<Supplier>("/api/suppliers", data);
  },

  update: async (id: string, data: any): Promise<Supplier> => {
    return api.patch<Supplier>(`/api/suppliers/${id}`, data);
  },
};

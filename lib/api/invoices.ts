import { api } from "./client";

export interface InvoiceItem {
  id?: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount: number;
  product?: {
    id: string;
    name: string;
    sku: string;
  };
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  clientId: string;
  client?: {
    id: string;
    name: string;
    company?: string | null;
    email?: string | null;
    phone?: string | null;
    gstin?: string | null;
  };
  status: "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
  issueDate: string;
  dueDate: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingCharge?: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  items: InvoiceItem[];
  payments?: any[];
  notes?: string | null;
  terms?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceListFilters {
  search?: string;
  status?: string;
  clientId?: string;
  limit?: number;
  offset?: number;
}

export const invoicesApi = {
  list: async (filters: InvoiceListFilters = {}): Promise<Invoice[]> => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.status && filters.status !== "ALL") params.set("status", filters.status);
    if (filters.clientId) params.set("clientId", filters.clientId);
    if (filters.limit) params.set("limit", String(filters.limit));
    if (filters.offset) params.set("offset", String(filters.offset));

    const queryStr = params.toString();
    const endpoint = `/api/invoices${queryStr ? `?${queryStr}` : ""}`;
    return api.get<Invoice[]>(endpoint);
  },

  getById: async (id: string): Promise<Invoice> => {
    return api.get<Invoice>(`/api/invoices/${id}`);
  },

  create: async (data: any): Promise<Invoice> => {
    return api.post<Invoice>("/api/invoices", data);
  },

  update: async (id: string, data: any): Promise<Invoice> => {
    return api.patch<Invoice>(`/api/invoices/${id}`, data);
  },

  cancel: async (id: string, reason?: string): Promise<{ success: boolean }> => {
    return api.post<{ success: boolean }>(`/api/invoices/${id}/cancel`, { reason });
  },
};

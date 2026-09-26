import { api } from "./client";

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  category?: string | null;
  type: "RAW_MATERIAL" | "COMPONENT" | "FINISHED_PRODUCT" | "CONSUMABLE" | "SERVICE" | "PHYSICAL_PRODUCT";
  isSaleable: boolean;
  quantityScale: number;
  pricingMode: "FIXED" | "REQUIREMENT_BASED";
  status: string;
  basePrice: number | null;
  taxRate: number;
  stockQuantity: number;
  minStock: number;
  rollingWACRupees?: number;
  valuationRupees?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListFilters {
  search?: string;
  category?: string;
  type?: string;
  saleable?: boolean;
  includeValuation?: boolean;
  limit?: number;
  offset?: number;
}

export const productsApi = {
  list: async (filters: ProductListFilters = {}): Promise<Product[]> => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.category && filters.category !== "ALL") params.set("category", filters.category);
    if (filters.type && filters.type !== "ALL") params.set("type", filters.type);
    if (filters.saleable) params.set("saleable", "true");
    if (filters.includeValuation !== false) params.set("includeValuation", "true");
    if (filters.limit) params.set("limit", String(filters.limit));
    if (filters.offset) params.set("offset", String(filters.offset));

    const queryStr = params.toString();
    const endpoint = `/api/products${queryStr ? `?${queryStr}` : ""}`;
    return api.get<Product[]>(endpoint);
  },

  getById: async (id: string): Promise<Product> => {
    return api.get<Product>(`/api/products/${id}`);
  },

  create: async (data: any): Promise<Product> => {
    return api.post<Product>("/api/products", data);
  },

  update: async (id: string, data: any): Promise<Product> => {
    return api.patch<Product>(`/api/products/${id}`, data);
  },

  adjustStock: async (data: {
    productId: string;
    quantityChange: number;
    type: string;
    notes?: string;
  }): Promise<any> => {
    return api.post("/api/inventory/adjust", data);
  },
};

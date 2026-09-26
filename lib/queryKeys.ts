/**
 * TAMIZHTECH ERP — QUERY KEY FACTORY
 * Canonical, hierarchical query key structure ensuring:
 * - Type-safe query references
 * - Coarse and fine-grained invalidation
 * - Deterministic serialization of filters
 */

export const queryKeys = {
  // 1. Invoices
  invoices: {
    all: ["invoices"] as const,
    lists: () => [...queryKeys.invoices.all, "list"] as const,
    list: (filters?: Record<string, any>) =>
      [...queryKeys.invoices.lists(), filters ?? {}] as const,
    details: () => [...queryKeys.invoices.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.invoices.details(), id] as const,
    stats: () => [...queryKeys.invoices.all, "stats"] as const,
  },

  // 2. Clients / Customers
  clients: {
    all: ["clients"] as const,
    lists: () => [...queryKeys.clients.all, "list"] as const,
    list: (filters?: Record<string, any>) =>
      [...queryKeys.clients.lists(), filters ?? {}] as const,
    details: () => [...queryKeys.clients.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.clients.details(), id] as const,
    financialSummary: (id: string) =>
      [...queryKeys.clients.detail(id), "financial-summary"] as const,
  },

  // 3. Products & Stock Ledger
  products: {
    all: ["products"] as const,
    lists: () => [...queryKeys.products.all, "list"] as const,
    list: (filters?: Record<string, any>) =>
      [...queryKeys.products.lists(), filters ?? {}] as const,
    details: () => [...queryKeys.products.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
    valuation: () => [...queryKeys.products.all, "valuation"] as const,
    stockHistory: (id: string) => [...queryKeys.products.detail(id), "history"] as const,
  },

  // 4. Quotations
  quotations: {
    all: ["quotations"] as const,
    lists: () => [...queryKeys.quotations.all, "list"] as const,
    list: (filters?: Record<string, any>) =>
      [...queryKeys.quotations.lists(), filters ?? {}] as const,
    details: () => [...queryKeys.quotations.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.quotations.details(), id] as const,
  },

  // 5. Sales Orders
  salesOrders: {
    all: ["salesOrders"] as const,
    lists: () => [...queryKeys.salesOrders.all, "list"] as const,
    list: (filters?: Record<string, any>) =>
      [...queryKeys.salesOrders.lists(), filters ?? {}] as const,
    details: () => [...queryKeys.salesOrders.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.salesOrders.details(), id] as const,
  },

  // 6. Projects & Tasks
  projects: {
    all: ["projects"] as const,
    lists: () => [...queryKeys.projects.all, "list"] as const,
    list: (filters?: Record<string, any>) =>
      [...queryKeys.projects.lists(), filters ?? {}] as const,
    details: () => [...queryKeys.projects.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.projects.details(), id] as const,
    tasks: (projectId: string) =>
      [...queryKeys.projects.detail(projectId), "tasks"] as const,
  },

  // 7. Suppliers & Procurement
  suppliers: {
    all: ["suppliers"] as const,
    lists: () => [...queryKeys.suppliers.all, "list"] as const,
    list: (filters?: Record<string, any>) =>
      [...queryKeys.suppliers.lists(), filters ?? {}] as const,
    details: () => [...queryKeys.suppliers.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.suppliers.details(), id] as const,
  },

  purchaseOrders: {
    all: ["purchaseOrders"] as const,
    lists: () => [...queryKeys.purchaseOrders.all, "list"] as const,
    list: (filters?: Record<string, any>) =>
      [...queryKeys.purchaseOrders.lists(), filters ?? {}] as const,
    details: () => [...queryKeys.purchaseOrders.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.purchaseOrders.details(), id] as const,
  },

  procurementRequests: {
    all: ["procurementRequests"] as const,
    lists: () => [...queryKeys.procurementRequests.all, "list"] as const,
    list: (filters?: Record<string, any>) =>
      [...queryKeys.procurementRequests.lists(), filters ?? {}] as const,
  },

  // 8. Payments & Financial Transactions
  payments: {
    all: ["payments"] as const,
    lists: () => [...queryKeys.payments.all, "list"] as const,
    list: (filters?: Record<string, any>) =>
      [...queryKeys.payments.lists(), filters ?? {}] as const,
    details: () => [...queryKeys.payments.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.payments.details(), id] as const,
  },

  // 9. Dashboard & Operational Analytics
  dashboard: {
    all: ["dashboard"] as const,
    metrics: (filters?: Record<string, any>) =>
      [...queryKeys.dashboard.all, "metrics", filters ?? {}] as const,
    procurementMetrics: () => [...queryKeys.dashboard.all, "procurement"] as const,
    charts: (period?: string) => [...queryKeys.dashboard.all, "charts", period ?? "current"] as const,
  },

  // 10. Global Search & Command Palette
  search: {
    global: (query: string) => ["global-search", query] as const,
  },
};

export interface Client {
  id: string
  clientCode: string
  name: string
  phone: string
  email: string
  city: string | null
  serviceType: string | null
  source: string | null
  type: string
  status: string
  assignedToId: string | null
  createdAt: string
  updatedAt: string
}

export interface LineItem {
  id?: string
  description: string
  qty: number
  unitPrice: number
  amount: number
}

export interface Invoice {
  id: string
  invoiceNo: string
  clientId: string
  clientName: string
  status: string
  date: string
  dueDate: string
  subtotal: number
  gstAmount: number
  total: number
  paidAmount: number
  balance: number
  createdAt: string
  updatedAt: string
  items?: LineItem[]
}

export interface Payment {
  id: string
  paymentNo: string
  invoiceId: string | null
  clientId: string
  amount: number
  date: string
  mode: string
  status: string
  transactionId: string | null
  createdAt: string
}

export interface FollowUp {
  id: string
  clientId: string | null
  leadId: string | null
  date: string
  mode: string
  status: string
  notes: string | null
}

export interface Application {
  id: string
  appNo: string
  clientId: string
  status: string
  course: string
  createdAt: string
}

export interface UpdateClientInput {
  name: string
  email: string
  phone: string
  city?: string
  serviceType?: string
  source?: string
  type?: string
  status?: string
  assignedToId?: string
}

export interface CreateInvoiceInput {
  clientId: string
  date: string
  dueDate: string
  items: LineItem[]
  status?: string
}

export interface DashboardStats {
  totalActiveClients: number
  totalRevenueThisMonth: number
  totalOutstandingBalance: number
  pendingFollowUps: number
  overdueFollowUps: number
  overdueInvoices: number
  monthlyRevenue: { month: string; revenue: number }[]
  paymentStatusBreakdown: { 
    paid: number; 
    partial: number; 
    unpaid: number;
    paidAmount: number;
    partialAmount: number;
    unpaidAmount: number;
  }
  recentInvoices: Invoice[]
  upcomingFollowUps: FollowUp[]
  totalEmployees: number
  activeProjects: number
  inventoryValue: number
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

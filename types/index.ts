export interface Client {
  id: string
  clientCode: string
  name: string
  company?: string | null
  phone: string
  mobileNormalized: string
  email?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  gstin?: string | null
  serviceType?: string | null
  source?: string | null
  type: string
  status: string
  notes?: string | null
  assignedToId?: string | null
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
  issuedAt?: string | null
  cancelledAt?: string | null
  sentAt?: string | null
  createdAt: string
  updatedAt: string
  items?: LineItem[]
}

export interface CanonicalInvoiceFinancials {
  subtotal: number
  discountAmount: number
  taxableAmount: number
  gstPercent: number
  cgstAmount: number
  sgstAmount: number
  totalGst: number
  shippingAmount: number
  totalAmount: number
  totalInWords: string
  netPaidAmount: number
  outstandingBalance: number
  paymentStatus: "PAID" | "PARTIALLY_PAID" | "UNPAID" | "OVERDUE"
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
  clientName?: string | null
  leadId: string | null
  date: string
  time?: string | null
  mode: string
  status: string
  notes: string | null
  summary?: string | null
  nextAction?: string | null
}

export interface PaymentStatusBreakdown {
  paid: number
  partial: number
  unpaid: number
}

export interface MonthlyRevenue {
  month: string
  revenue: number
}

export interface Application {
  id: string
  appNo?: string
  clientId?: string
  clientName?: string
  name?: string
  phone?: string
  email?: string
  city?: string
  appliedFor?: string
  course?: string
  source?: string
  notes?: string
  appliedDate?: string
  status: string
  createdAt?: string
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

export interface CreatePaymentInput {
  invoiceId?: string
  clientId: string
  amount: number
  date?: string
  mode?: string
  status?: string
  transactionId?: string
  referenceNo?: string
  notes?: string
}

export interface CreateFollowUpInput {
  clientId?: string
  leadId?: string
  date?: string
  time?: string
  mode?: string
  status?: string
  notes?: string
  summary?: string
  nextAction?: string
}

export interface CreateApplicationInput {
  clientId?: string
  name?: string
  email?: string
  phone?: string
  city?: string
  appliedFor?: string
  course?: string
  source?: string
  notes?: string
  status?: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

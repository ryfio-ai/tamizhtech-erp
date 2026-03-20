export interface Client {
  id: string
  name: string
  phone: string
  email: string
  city: string
  serviceType: ServiceType
  source: ClientSource
  status: ClientStatus
  createdAt: string
  notes: string
}

export interface Invoice {
  id: string
  invoiceNo: string
  clientId: string
  clientName: string
  date: string
  dueDate: string
  items: LineItem[]
  gstPercent: number
  discountPercent: number
  subtotal: number
  gstAmount: number
  discountAmount: number
  total: number
  paidAmount: number
  balance: number
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  notes: string
  createdAt: string
}

export interface LineItem {
  description: string
  qty: number
  unitPrice: number
  amount: number
}

export interface Payment {
  id: string
  paymentId: string
  invoiceId: string
  invoiceNo: string
  clientId: string
  clientName: string
  date: string
  amount: number
  mode: PaymentMode
  referenceNo: string
  notes: string
  createdAt: string
}

export interface FollowUp {
  id: string
  clientId: string
  clientName: string
  date: string
  time: string
  mode: FollowUpMode
  summary: string
  nextAction: string
  status: FollowUpStatus
  createdAt: string
}

export interface Application {
  id: string
  applicationNo: string
  name: string
  email: string
  phone: string
  city: string
  appliedFor: string
  appliedDate: string
  status: ApplicationStatus
  source: string
  notes: string
  emailSent: boolean
  createdAt: string
}

export interface MonthlyRevenue {
  month: string
  revenue: number
}

export interface PaymentStatusBreakdown {
  Paid: number
  Partial: number
  Unpaid: number
}

export interface DashboardStats {
  totalActiveClients: number
  totalRevenueThisMonth: number
  totalOutstandingBalance: number
  pendingFollowUps: number
  overdueFollowUps: number
  overdueInvoices: number
  monthlyRevenue: MonthlyRevenue[]
  paymentStatusBreakdown: PaymentStatusBreakdown
  recentInvoices: Invoice[]
  upcomingFollowUps: FollowUp[]
}

export type ClientStatus = 'Lead' | 'Active' | 'Inactive' | 'Blacklisted'

export type ServiceType = 
  | 'Robotics Workshop' 
  | 'Arduino Training' 
  | 'IoT Project' 
  | 'Drone Training' 
  | 'Custom Project' 
  | 'Tamizh Robotics Club'

export type ClientSource = 
  | 'Walk-in' 
  | 'Referral' 
  | 'Online' 
  | 'Social Media' 
  | 'College' 
  | 'Event'

export type PaymentStatus = 'Paid' | 'Partial' | 'Unpaid'

export type PaymentMethod = 
  | 'UPI' 
  | 'Bank Transfer' 
  | 'Cash' 
  | 'Cheque' 
  | 'Online'

export type PaymentMode = 
  | 'UPI' 
  | 'Bank Transfer' 
  | 'Cash' 
  | 'Cheque' 
  | 'Online'

export type FollowUpMode = 
  | 'Call' 
  | 'Email' 
  | 'WhatsApp' 
  | 'Visit' 
  | 'Meeting'

export type FollowUpStatus = 'Pending' | 'Done' | 'Overdue'

export type ApplicationStatus = 
  | 'New' 
  | 'Contacted' 
  | 'Enrolled' 
  | 'Rejected' 
  | 'Waitlisted'

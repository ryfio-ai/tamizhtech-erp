import { z } from 'zod';

// Field Enums for validation
export const ClientStatusEnum = z.enum(['Lead', 'Active', 'Inactive', 'Blacklisted']);
export const ServiceTypeEnum = z.enum([
  'Robotics Workshop', 
  'Arduino Training', 
  'IoT Project', 
  'Drone Training', 
  'Custom Project', 
  'Tamizh Robotics Club'
]);
export const ClientSourceEnum = z.enum(['Walk-in', 'Referral', 'Online', 'Social Media', 'College', 'Event']);
export const PaymentStatusEnum = z.enum(['Paid', 'Partial', 'Unpaid']);
export const PaymentMethodEnum = z.enum(['UPI', 'Bank Transfer', 'Cash', 'Cheque', 'Online']);
export const FollowUpModeEnum = z.enum(['Call', 'Email', 'WhatsApp', 'Visit', 'Meeting']);
export const FollowUpStatusEnum = z.enum(['Pending', 'Done', 'Overdue']);
export const ApplicationStatusEnum = z.enum(['New', 'Contacted', 'Enrolled', 'Rejected', 'Waitlisted']);

// Schemas
export const clientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().regex(/^[0-9]{10}$/, 'Phone must be 10 digits'),
  email: z.string().email('Invalid email address'),
  city: z.string().min(1, 'City is required'),
  serviceType: ServiceTypeEnum,
  source: ClientSourceEnum,
  status: ClientStatusEnum.default('Lead'),
  notes: z.string().optional(),
});

export const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  qty: z.coerce.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.coerce.number().min(0, 'Unit price must be positive'),
  amount: z.coerce.number(),
});

export const invoiceSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  clientName: z.string(),
  date: z.string(),
  dueDate: z.string(),
  items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  gstPercent: z.coerce.number().min(0).default(18),
  discountPercent: z.coerce.number().min(0).default(0),
  subtotal: z.coerce.number(),
  gstAmount: z.coerce.number(),
  discountAmount: z.coerce.number(),
  total: z.coerce.number().min(0),
  paymentMethod: PaymentMethodEnum,
  notes: z.string().optional(),
});

export const paymentSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice is required'),
  invoiceNo: z.string(),
  clientId: z.string(),
  clientName: z.string(),
  date: z.string(),
  amount: z.coerce.number().min(1, 'Amount must be greater than 0'),
  mode: PaymentMethodEnum,
  referenceNo: z.string().optional(),
  notes: z.string().optional(),
});

export const followUpSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  clientName: z.string(),
  date: z.string(),
  time: z.string(),
  mode: FollowUpModeEnum,
  summary: z.string().min(1, 'Summary is required'),
  nextAction: z.string().min(1, 'Next action is required'),
  status: FollowUpStatusEnum.default('Pending'),
});

export const applicationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[0-9]{10}$/, 'Phone must be 10 digits'),
  city: z.string().min(1, 'City is required'),
  appliedFor: z.string().min(1, 'Applied for is required'),
  appliedDate: z.string(),
  status: ApplicationStatusEnum.default('New'),
  source: z.string().optional(),
  notes: z.string().optional(),
});

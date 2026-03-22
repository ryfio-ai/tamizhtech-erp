import * as z from 'zod';

export const phoneRegex = /^[0-9]{10}$/;

// ─── CRM Validations ───────────────────────────────────────
export const clientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().regex(phoneRegex, "Phone must be exactly 10 digits."),
  city: z.string().min(2, "City is required.").optional(),
  type: z.string().default("INDIVIDUAL"),
  status: z.string().default("LEAD"),
  serviceType: z.string().optional(),
  source: z.string().optional(),
  assignedToId: z.string().optional(),
});

export const leadSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().regex(phoneRegex).optional().or(z.literal('')),
  status: z.string().default("NEW"),
  source: z.string().optional(),
  assignedToId: z.string().optional(),
});

// ─── Sales Validations ─────────────────────────────────────
export const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  qty: z.coerce.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative"),
});

export const invoiceSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  date: z.coerce.date().default(() => new Date()),
  dueDate: z.coerce.date(),
  items: z.array(lineItemSchema).min(1, "At least one item is required"),
  status: z.string().default("DRAFT"),
});

// ─── Finance Validations ───────────────────────────────────
export const paymentSchema = z.object({
  invoiceId: z.string().optional(),
  clientId: z.string().min(1, "Client is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  date: z.coerce.date().default(() => new Date()),
  mode: z.string().default("UPI"),
  status: z.string().default("COMPLETED"),
  transactionId: z.string().optional(),
});

// ─── CRM Follow-up Validations ─────────────────────────────
export const followUpSchema = z.object({
  clientId: z.string().optional(),
  leadId: z.string().optional(),
  date: z.coerce.date().default(() => new Date()),
  mode: z.string().default("CALL"),
  status: z.string().default("PENDING"),
  notes: z.string().optional(),
});

// ─── Education Validations ─────────────────────────────────
export const applicationSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  course: z.string().min(2, "Course is required"),
  status: z.string().default("NEW"),
});

// ─── HR Validations ──────────────────────────────────────────
export const employeeSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  designation: z.string().min(2, "Designation is required"),
  department: z.string().min(2, "Department is required"),
  status: z.string().default("ACTIVE"),
  userId: z.string().optional(),
  // For dual creation
  email: z.string().email("Valid email required for ERP access").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  role: z.string().optional(),
});

// ─── Inventory Validations ──────────────────────────────────
export const productSchema = z.object({
  name: z.string().min(2, "Product name is required"),
  description: z.string().optional(),
  type: z.string().default("PHYSICAL"),
  status: z.string().default("ACTIVE"),
  basePrice: z.coerce.number().min(0),
  taxRate: z.coerce.number().default(18),
  stockQuantity: z.coerce.number().default(0),
});

// ─── Project Validations ────────────────────────────────────
export const projectSchema = z.object({
  name: z.string().min(2, "Project name is required"),
  clientId: z.string().min(1, "Client is required"),
  status: z.string().default("PLANNING"),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  budget: z.coerce.number().optional(),
});

export const taskSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  title: z.string().min(2, "Task title is required"),
  status: z.string().default("TODO"),
  priority: z.string().default("MEDIUM"),
  assignedToId: z.string().optional(),
  dueDate: z.coerce.date().optional(),
});

export type ClientFormValues = z.infer<typeof clientSchema>;
export type ProjectFormValues = z.infer<typeof projectSchema>;
export type TaskFormValues = z.infer<typeof taskSchema>;
export type ProductFormValues = z.infer<typeof productSchema>;
export type EmployeeFormValues = z.infer<typeof employeeSchema>;
export type LeadFormValues = z.infer<typeof leadSchema>;
export type InvoiceFormValues = z.infer<typeof invoiceSchema>;
export type PaymentFormValues = z.infer<typeof paymentSchema>;
export type FollowUpFormValues = z.infer<typeof followUpSchema>;
export type ApplicationFormValues = z.infer<typeof applicationSchema>;

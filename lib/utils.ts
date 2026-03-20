import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(num || 0);
}

export function formatDate(date: string | Date) {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd-MMM-yyyy');
}

export function generateId() {
  return uuidv4();
}

export function calculateInvoiceTotals(items: { qty: number; unitPrice: number }[], gstPercent = 18, discountPercent = 0) {
  const subtotal = items.reduce((acc, item) => acc + (item.qty * item.unitPrice), 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const taxableAmount = subtotal - discountAmount;
  const gstAmount = (taxableAmount * gstPercent) / 100;
  const total = taxableAmount + gstAmount;

  return {
    subtotal,
    discountAmount,
    gstAmount,
    total,
  };
}

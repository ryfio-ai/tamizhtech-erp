import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

/**
 * Combines tailwind classes smoothly for shadcn/ui
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number to Indian currency format (e.g. ₹1,23,456.00)
 */
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0.00';
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Formats a date to DD-MMM-YYYY (e.g. 20-Mar-2026)
 */
export function formatDate(date: string | Date, fallback: string = 'N/A'): string {
  if (!date) return fallback;
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return fallback;
    return format(d, 'dd-MMM-yyyy');
  } catch (error) {
    return fallback;
  }
}

/**
 * Formats a date to include time DD-MMM-YYYY hh:mm a
 */
export function formatDateTime(date: string | Date, fallback: string = 'N/A'): string {
  if (!date) return fallback;
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return fallback;
    return format(d, 'dd-MMM-yyyy hh:mm a');
  } catch (error) {
    return fallback;
  }
}

/**
 * Generates a standard UUID
 */
export function generateId(): string {
  return uuidv4();
}

/**
 * Delay utility for mocking/testing or rate-limiting
 */
export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

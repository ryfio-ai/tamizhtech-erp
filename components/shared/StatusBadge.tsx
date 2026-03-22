import { cn } from "@/lib/utils";
import { type ClientStatus, type PaymentStatus, type FollowUpStatus, type ApplicationStatus } from "@/types";

type AnyStatus = ClientStatus | PaymentStatus | FollowUpStatus | ApplicationStatus | string;

export function StatusBadge({ status, className }: { 
  status: AnyStatus; 
  className?: string;
  type?: "client" | "payment" | "followup" | "application";
}) {
  
  const getColors = (s: AnyStatus) => {
    switch(s) {
      // Green
      case 'Active':
      case 'Paid':
      case 'Done':
      case 'Enrolled':
        return "bg-green-100 text-green-700 border-green-200";
      
      // Blue / Neutral
      case 'Lead':
      case 'New':
        return "bg-blue-100 text-blue-700 border-blue-200";
        
      // Yellow / Amber
      case 'Partial':
      case 'Contacted':
      case 'Pending':
        return "bg-amber-100 text-amber-700 border-amber-200";
        
      // Red / Dark
      case 'Unpaid':
      case 'Blacklisted':
      case 'Rejected':
      case 'Overdue':
        return "bg-red-100 text-red-700 border-red-200";
        
      // Gray
      case 'Inactive':
      case 'Waitlisted':
        return "bg-gray-100 text-gray-700 border-gray-200";
        
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
      getColors(status),
      className
    )}>
      {status}
    </span>
  );
}

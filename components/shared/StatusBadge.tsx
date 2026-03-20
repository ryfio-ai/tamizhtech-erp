import { cn } from "@/lib/utils";
import { 
  ClientStatus, 
  PaymentStatus, 
  FollowUpStatus, 
  ApplicationStatus 
} from "@/types";

interface StatusBadgeProps {
  status: ClientStatus | PaymentStatus | FollowUpStatus | ApplicationStatus | string;
  type: 'client' | 'payment' | 'followup' | 'application';
}

export default function StatusBadge({ status, type }: StatusBadgeProps) {
  const getStyles = () => {
    switch (status) {
      // Payment Status
      case 'Paid': return 'bg-green-100 text-green-700 border-green-200';
      case 'Partial': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Unpaid': return 'bg-red-100 text-red-700 border-red-200';
      
      // Client Status
      case 'Active': return 'bg-green-100 text-green-700 border-green-200';
      case 'Lead': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Inactive': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'Blacklisted': return 'bg-black text-white border-gray-900';
      
      // Follow-up Status
      case 'Done': return 'bg-green-100 text-green-700 border-green-200';
      case 'Pending': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Overdue': return 'bg-red-100 text-red-700 border-red-200 shadow-[0_0_10px_rgba(239,68,68,0.2)]';
      
      // Application Status
      case 'New': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Contacted': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Enrolled': return 'bg-green-100 text-green-700 border-green-200';
      case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'Waitlisted': return 'bg-amber-100 text-amber-700 border-amber-200';
      
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <span className={cn(
      "px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all inline-block",
      getStyles()
    )}>
      {status}
    </span>
  );
}

"use client";

import { FollowUp } from "@/types";
import { formatDate } from "@/lib/utils";
import { FileSearch, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpcomingFollowUpsProps {
  data: FollowUp[];
  onMarkDone?: (id: string, clientId: string) => void;
}

export function UpcomingFollowUps({ data, onMarkDone }: UpcomingFollowUpsProps) {
  
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500 h-full">
        <FileSearch className="w-8 h-8 text-gray-300 mb-2" />
        <p className="text-sm">No upcoming follow-ups scheduled.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((item, idx) => {
        const isOverdue = item.status === 'Overdue';
        
        return (
          <div key={idx} className="flex items-start justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
            <div className="flex flex-col gap-1 w-[70%]">
              <div className="flex items-center gap-2">
                <span className="font-medium text-navy text-sm truncate">{item.clientName}</span>
                {isOverdue && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">OVERDUE</span>
                )}
              </div>
              <span className="text-xs text-brand font-medium">
                {formatDate(item.date)} at {item.time} ({item.mode})
              </span>
              <p className="text-xs text-gray-500 line-clamp-2 mt-1" title={item.nextAction || item.summary}>
                {item.nextAction || item.summary || "No specific action noted"}
              </p>
            </div>
            
            {onMarkDone && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onMarkDone(item.id, item.clientId)}
                className="h-8 gap-1 border-gray-200 hover:border-green-500 hover:text-green-600 hover:bg-green-50 shrink-0"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Done
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

"use client"

import * as React from "react"
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface DateRangeProps {
  from?: Date
  to?: Date
  onChange: (range: { from?: Date; to?: Date }) => void
}

export function DateRangePicker({ from, to, onChange }: DateRangeProps) {
  // Simplified version. Ideally uses react-day-picker inside a Popover.
  // Given time complexity of full calendar, we emulate presets.

  const presets = [
    {
      label: "Today",
      from: new Date(),
      to: new Date()
    },
    {
      label: "This Week",
      from: subDays(new Date(), 7),
      to: new Date()
    },
    {
      label: "This Month",
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date())
    },
    {
      label: "Last Month",
      from: startOfMonth(subMonths(new Date(), 1)),
      to: endOfMonth(subMonths(new Date(), 1))
    }
  ]

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange({ from: undefined, to: undefined })
  }

  return (
     <div className="flex items-center gap-2">
       {/* Simplified UI for fast MVP delivery without complex Popovers */}
       <div className="flex bg-white rounded-md border border-gray-200 p-1 shadow-sm overflow-x-auto">
         {presets.map(p => (
           <Button
             key={p.label}
             variant="ghost"
             size="sm"
             className={cn("px-3 py-1 h-8 text-xs font-medium rounded-sm", 
               from?.getTime() === p.from.getTime() ? "bg-brand/10 text-brand" : "text-gray-600 hover:bg-gray-100"
             )}
             onClick={() => onChange({ from: p.from, to: p.to })}
           >
             {p.label}
           </Button>
         ))}
         {(from || to) && (
           <Button variant="ghost" size="sm" onClick={handleClear} className="h-8 w-8 p-0 ml-1 text-gray-400 hover:text-red-500 rounded-sm">
             <X className="w-4 h-4" />
           </Button>
         )}
       </div>
       <div className="hidden lg:flex items-center gap-2 text-xs text-gray-500 px-2 h-10 border border-gray-200 rounded-md bg-gray-50">
         <CalendarIcon className="w-3 h-3 text-brand" />
         {from ? format(from, 'dd MMM yyyy') : 'Start'} 
         <span className="text-gray-300">-</span>
         {to ? format(to, 'dd MMM yyyy') : 'End'}
       </div>
     </div>
  );
}

"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
  iconClassName?: string;
}

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  trend, 
  trendValue,
  className,
  iconClassName 
}: StatsCardProps) {
  return (
    <div className={cn("p-6 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500 tracking-tight">{title}</h3>
        <div className={cn("p-2 rounded-lg bg-gray-50", iconClassName)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      
      <div className="flex items-baseline gap-2 mt-auto">
        <h2 className="text-3xl font-bold text-navy truncate">{value}</h2>
        
        {trendValue && (
          <span className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded-full flex items-center",
            trend === "up" ? "bg-green-100 text-green-700" :
            trend === "down" ? "bg-red-100 text-red-700" :
            "bg-gray-100 text-gray-700"
          )}>
            {trend === "up" ? "+" : trend === "down" ? "-" : ""}{trendValue}
          </span>
        )}
      </div>
      
      {description && (
        <p className="text-xs text-gray-400 mt-2 truncate">{description}</p>
      )}
    </div>
  );
}

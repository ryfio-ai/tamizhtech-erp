import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  iconClassName?: string;
}

export default function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
  iconClassName,
}: StatsCardProps) {
  return (
    <Card className={cn("overflow-hidden border-0 shadow-sm bg-white rounded-2xl transition-all hover:shadow-md", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">{title}</p>
          <div className={cn("p-2 rounded-lg bg-gray-50", iconClassName)}>
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-3xl font-black text-navy tracking-tight">{value}</div>
          {description && (
            <p className="text-xs text-gray-400 mt-1 font-medium italic">
              {description}
            </p>
          )}
          {trend && (
            <div className={cn(
              "mt-2 text-xs font-bold inline-flex items-center",
              trend.isPositive ? "text-green-600" : "text-red-600"
            )}>
              {trend.isPositive ? '↑' : '↓'} {trend.value}%
              <span className="text-gray-400 ml-1 font-normal uppercase tracking-tighter">vs last month</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

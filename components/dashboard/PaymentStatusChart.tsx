"use client";

import { PaymentStatusBreakdown } from "@/types";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface PaymentStatusChartProps {
  data: PaymentStatusBreakdown;
}

export function PaymentStatusChart({ data }: PaymentStatusChartProps) {
  const chartData = [
    { name: "Paid", value: data.paid, color: "#10b981" },     // Emerald 500
    { name: "Partial", value: data.partial, color: "#f59e0b" }, // Amber 500
    { name: "Unpaid", value: data.unpaid, color: "#ef4444" },   // Red 500
  ].filter(item => item.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50/50 rounded-lg">
        No payment data available
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: '1px solid #eee' }}
            formatter={(value: number) => [`${value} Invoices`]}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconType="circle"
            formatter={(value, entry: any) => (
              <span className="text-gray-600 font-medium text-sm ml-1">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

'use client';

import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PaymentStatusChartProps {
  data: {
    Paid: number;
    Partial: number;
    Unpaid: number;
  };
}

const COLORS = ['#C0392B', '#fbbf24', '#ef4444'];
const LABELS = ['Paid', 'Partial', 'Unpaid'];

export default function PaymentStatusChart({ data }: PaymentStatusChartProps) {
  const chartData = [
    { name: 'Paid', value: data.Paid },
    { name: 'Partial', value: data.Partial },
    { name: 'Unpaid', value: data.Unpaid },
  ].filter(d => d.value > 0);

  return (
    <Card className="border-0 shadow-sm bg-white rounded-2xl h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold text-navy tracking-tight">Payment Status Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px] flex items-center justify-center pt-6">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={8}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => {
                    const colorIndex = LABELS.indexOf(entry.name);
                    return <Cell key={`cell-${index}`} fill={COLORS[colorIndex]} className="transition-all hover:opacity-80 drop-shadow-sm" />;
                })}
              </Pie>
              <Tooltip 
                 contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontWeight: 'bold' }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold', fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400">
            <p className="text-sm font-bold uppercase tracking-widest">No data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

interface ProgressChartProps {
  data: any[];
  type: 'line' | 'bar';
  dataKey: string;
  index: string;
}

export function ProgressChart({
  data,
  type,
  dataKey,
  index,
}: ProgressChartProps) {
  const ChartComponent = type === 'line' ? LineChart : BarChart;
  const ChartElement = type === 'line' ? Line : Bar;

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ChartComponent
        data={data}
        margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis
          dataKey={index}
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip
          cursor={{ fill: 'hsla(var(--muted))' }}
          contentStyle={{
            background: 'hsl(var(--background))',
            borderColor: 'hsl(var(--border))',
            borderRadius: 'var(--radius)',
          }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
        />
        <ChartElement
          dataKey={dataKey}
          fill="hsl(var(--primary))"
          stroke="hsl(var(--primary))"
          radius={type === 'bar' ? [4, 4, 0, 0] : undefined}
          dot={type === 'line' ? true : undefined}
          activeDot={type === 'line' ? { r: 8 } : undefined}
        />
      </ChartComponent>
    </ResponsiveContainer>
  );
}

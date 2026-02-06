
"use client";

import { useState } from "react";
import { PieChart, Pie, BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from '@/lib/utils';
import { ChartTypeSwitcher, ChartType } from "./chart-type-switcher";
import { ChartLayoutSwitcher, ChartLayout } from "./chart-layout-switcher";
import { Move, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/contexts/DashboardContext";

type ChartData = {
  name: string;
  value: number;
};

export function ReceitaCategoriaChart({ data, onRemove }: { data: ChartData[], onRemove?: () => void }) {
  const { palette } = useDashboard();
  const [chartType, setChartType] = useState<ChartType>("pie");
  const [barLayout, setBarLayout] = useState<ChartLayout>('vertical');

  const chartDataWithColors = data.map((entry, index) => ({
    ...entry,
    fill: palette[index % palette.length],
  }));
  
  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartDataWithColors} margin={{ top: 5, right: 20, left: 20, bottom: 60 }}>
              <XAxis dataKey="name" stroke="hsl(var(--foreground))" fontSize={12} interval={0} angle={-45} textAnchor="end" height={60} />
              <YAxis tickFormatter={(value) => `${formatCurrency(Number(value) / 1000)}k`} fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} formatter={(value) => formatCurrency(Number(value))} />
              <Legend wrapperStyle={{ fontSize: "10px" }} />
              <Line type="monotone" dataKey="value" name="Receita" stroke={palette[0]} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartDataWithColors} margin={{ top: 5, right: 20, left: 20, bottom: 60 }}>
              <defs>
                <linearGradient id="categoriaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={palette[0]} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={palette[0]} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="hsl(var(--foreground))" fontSize={12} interval={0} angle={-45} textAnchor="end" height={60} />
              <YAxis tickFormatter={(value) => `${formatCurrency(Number(value) / 1000)}k`} fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} formatter={(value) => formatCurrency(Number(value))} />
              <Legend wrapperStyle={{ fontSize: "10px" }} />
              <Area type="monotone" dataKey="value" name="Receita" stroke={palette[0]} fill="url(#categoriaGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'bar':
        if(barLayout === 'vertical') {
            return (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartDataWithColors} margin={{ top: 5, right: 20, left: 20, bottom: 60 }}>
                        <XAxis dataKey="name" stroke="hsl(var(--foreground))" fontSize={12} interval={0} angle={-45} textAnchor="end" height={60} />
                        <YAxis tickFormatter={(value) => `${formatCurrency(Number(value) / 1000)}k`} fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip
                            cursor={{ fill: "hsl(var(--muted))" }}
                            contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                            formatter={(value) => formatCurrency(Number(value))}
                        />
                        <Legend wrapperStyle={{ fontSize: "10px" }} />
                        <Bar dataKey="value" name="Receita" radius={[4, 4, 0, 0]}>
                            {chartDataWithColors.map((entry) => (
                                <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            );
        } else { // horizontal
            const dynamicHeight = Math.max(200, data.length * 40);
            return (
                <ResponsiveContainer width="100%" height={dynamicHeight}>
                    <BarChart data={chartDataWithColors} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                        <XAxis type="number" tickFormatter={(value) => `${formatCurrency(Number(value) / 1000)}k`} fontSize={12} />
                        <YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false} fontSize={12} interval={0} />
                        <Tooltip cursor={{fill: 'hsl(var(--muted))'}} formatter={(value) => formatCurrency(Number(value))}/>
                        <Legend wrapperStyle={{ fontSize: "12px" }} />
                        <Bar dataKey="value" name="Receita" radius={[0, 4, 4, 0]}>
                            {chartDataWithColors.map((entry) => (
                                <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )
        }
      case 'pie':
      default:
        return (
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Tooltip
                        cursor={{ fill: "hsl(var(--muted))" }}
                        contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                        formatter={(value, name, props) => [`${formatCurrency(Number(value))} (${(props.payload.percent * 100).toFixed(0)}%)`, name]}
                    />
                    <Pie data={chartDataWithColors} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={10}>
                        {chartDataWithColors.map((entry) => (
                            <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                        ))}
                    </Pie>
                     <Legend wrapperStyle={{ fontSize: "10px" }} />
                </PieChart>
            </ResponsiveContainer>
        );
    }
  };

  return (
    <Card className="h-full grid grid-rows-[auto_1fr]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base drag-handle cursor-move">Receita por Categoria</CardTitle>
        <div className="flex items-center gap-2">
            <ChartTypeSwitcher value={chartType} onChange={(value) => setChartType(value as ChartType)} />
            {chartType === 'bar' && <ChartLayoutSwitcher value={barLayout} onChange={setBarLayout} />}
            {onRemove && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}>
                    <X className="h-4 w-4 text-muted-foreground" />
                </Button>
            )}
            <Move className="h-4 w-4 text-muted-foreground drag-handle cursor-move" />
        </div>
      </CardHeader>
      <CardContent className="p-4 grid grid-rows-1" style={{gridTemplateRows: 'minmax(0, 1fr)', overflow: 'auto'}}>
        {renderChart()}
      </CardContent>
    </Card>
  );
}

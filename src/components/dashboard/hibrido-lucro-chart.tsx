"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { Move, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LucratividadePorMetodologiaData } from "@/lib/types";
import { ChartTypeSwitcher, ChartType } from "./chart-type-switcher";
import { ChartLayoutSwitcher, ChartLayout } from "./chart-layout-switcher";
import { useDashboard } from "@/contexts/DashboardContext";

type WidgetProps = {
  data: LucratividadePorMetodologiaData[];
  onRemove?: () => void;
};

export function HibridoLucroChart({ data, onRemove }: WidgetProps) {
    const { palette } = useDashboard();
    const [chartType, setChartType] = useState<ChartType>("bar");
    const [barLayout, setBarLayout] = useState<ChartLayout>('vertical');
    
    const chartData = data
      .filter(item => item.metodologia === 'HIBRIDO')
      .map(item => ({
        polo: item.polo,
        'Repasse Híbrido': item.repasse,
        'Despesa (Alocada)': item.despesa,
        'Lucro Híbrido': item.lucro,
    }));
  
    const renderChart = () => {
      const renderVerticalBarChart = () => (
          <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 80 }}>
                  <XAxis type="category" dataKey="polo" fontSize={12} interval={0} angle={-45} textAnchor="end" height={80} />
                  <YAxis type="number" tickFormatter={(value) => `${formatCurrency(Number(value) / 1000)}k`} fontSize={12} />
                  <Tooltip cursor={{ fill: "hsl(var(--muted))" }} formatter={(value: number) => formatCurrency(value)} />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: '20px' }} />
                  <Bar dataKey="Repasse Híbrido" fill={palette[1]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Despesa (Alocada)" fill={palette[3]} radius={[4, 4, 0, 0]} />
              </BarChart>
          </ResponsiveContainer>
      );
  
      const renderHorizontalBarChart = () => {
          const dynamicHeight = Math.max(300, chartData.length * 50);
          return (
              <div style={{ height: `${dynamicHeight}px` }}>
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                          <XAxis type="number" tickFormatter={(value) => `${formatCurrency(Number(value) / 1000)}k`} fontSize={12} />
                          <YAxis type="category" dataKey="polo" width={100} tickLine={false} axisLine={false} fontSize={12} interval={0} />
                          <Tooltip cursor={{ fill: "hsl(var(--muted))" }} formatter={(value: number) => formatCurrency(value)} />
                          <Legend wrapperStyle={{ fontSize: "12px" }} />
                          <Bar dataKey="Repasse Híbrido" fill={palette[1]} radius={[0, 4, 4, 0]} />
                          <Bar dataKey="Despesa (Alocada)" fill={palette[3]} radius={[0, 4, 4, 0]} />
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          );
      };
      
      switch(chartType) {
        case 'line':
            return (
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 80 }}>
                        <XAxis dataKey="polo" fontSize={12} interval={0} angle={-45} textAnchor="end" height={80} />
                        <YAxis tickFormatter={(value) => `${formatCurrency(Number(value) / 1000)}k`} fontSize={12} />
                        <Tooltip cursor={{ fill: "hsl(var(--muted))" }} formatter={(value: number) => formatCurrency(value)} />
                        <Legend wrapperStyle={{ fontSize: "12px", paddingTop: '20px' }} />
                        <Line type="monotone" dataKey="Repasse Híbrido" stroke={palette[1]} />
                        <Line type="monotone" dataKey="Despesa (Alocada)" stroke={palette[3]} />
                        <Line type="monotone" dataKey="Lucro Híbrido" stroke={palette[2]} strokeDasharray="5 5" />
                    </LineChart>
                </ResponsiveContainer>
            );
        case 'area':
             return (
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 80 }}>
                        <XAxis dataKey="polo" fontSize={12} interval={0} angle={-45} textAnchor="end" height={80} />
                        <YAxis tickFormatter={(value) => `${formatCurrency(Number(value) / 1000)}k`} fontSize={12} />
                        <Tooltip cursor={{ fill: "hsl(var(--muted))" }} formatter={(value: number) => formatCurrency(value)} />
                        <Legend wrapperStyle={{ fontSize: "12px", paddingTop: '20px' }} />
                        <Area type="monotone" dataKey="Repasse Híbrido" stackId="a" stroke={palette[1]} fill={palette[1]} />
                        <Area type="monotone" dataKey="Despesa (Alocada)" stackId="a" stroke={palette[3]} fill={palette[3]} />
                    </AreaChart>
                </ResponsiveContainer>
            );
        case 'bar':
        default:
            return barLayout === 'vertical' ? renderVerticalBarChart() : renderHorizontalBarChart();
      }
    }

  return (
    <Card className="h-full grid grid-rows-[auto_1fr]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="drag-handle cursor-move">
            <CardTitle className="text-base">Gráfico: Lucro Cursos Híbridos</CardTitle>
            <CardDescription className="text-xs">Repasse Híbrido vs. Despesa Proporcional</CardDescription>
        </div>
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

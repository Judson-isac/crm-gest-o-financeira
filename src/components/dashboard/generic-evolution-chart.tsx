
"use client";

import { useState, useTransition, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { ChartTypeSwitcher, ChartType } from "./chart-type-switcher";
import { ChartLayoutSwitcher, ChartLayout } from "./chart-layout-switcher";
import { Move, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEvolucaoMensal } from "@/lib/api";
import type { Tipo, Filters } from "@/lib/types";
import { useDashboard } from "@/contexts/DashboardContext";

type ChartData = {
  name: string;
  value: number;
};

type GenericEvolutionChartProps = {
    title: string;
    tipo: Tipo | 'Faturamento';
    initialData: ChartData[];
    distinctAnos: number[];
    globalFilters: Filters;
    chartColor?: string; // Made optional
    gradientId: string;
    onRemove?: () => void;
};

export function GenericEvolutionChart({ title, tipo, initialData, distinctAnos, globalFilters, chartColor: chartColorProp, gradientId, onRemove }: GenericEvolutionChartProps) {
  const { palette } = useDashboard();
  const chartColor = chartColorProp || palette[0];
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [barLayout, setBarLayout] = useState<ChartLayout>('vertical');
  const [isPending, startTransition] = useTransition();
  
  const [localAno, setLocalAno] = useState<string>(globalFilters.ano?.toString() || 'all');
  const [data, setData] = useState(initialData);

  useEffect(() => {
    setData(initialData);
    setLocalAno(globalFilters.ano?.toString() || 'all');
  }, [initialData, globalFilters.ano]);

  const handleYearChange = (newAno: string) => {
    setLocalAno(newAno);
    startTransition(async () => {
      const year = newAno === 'all' ? undefined : parseInt(newAno);
      const newFilters = { ...globalFilters, ano: year, mes: undefined }; // Reset month when changing year locally
      const newData = await getEvolucaoMensal(tipo, newFilters);
      const chartData = tipo === 'Descontos' ? newData.map(d => ({ ...d, value: Math.abs(d.value) })) : newData;
      setData(chartData);
    });
  };
  
  const renderChart = () => {
    const commonTooltip = (
      <Tooltip
        cursor={{ fill: "hsl(var(--muted))" }}
        contentStyle={{
          backgroundColor: "hsl(var(--background))",
          border: "1px solid hsl(var(--border))",
        }}
        formatter={(value) => formatCurrency(Number(value))}
      />
    );

    if(chartType === 'line') {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <XAxis dataKey="name" stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${formatCurrency(Number(value) / 1000)}k`} />
              {commonTooltip}
              <Line type="monotone" dataKey="value" name={title} stroke={chartColor} strokeWidth={2} dot={{r: 4}} activeDot={{r: 6}} />
            </LineChart>
          </ResponsiveContainer>
        );
    }
    if(chartType === 'area') {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${formatCurrency(Number(value) / 1000)}k`} />
              {commonTooltip}
              <Area type="monotone" dataKey="value" name={title} stroke={chartColor} fillOpacity={1} fill={`url(#${gradientId})`} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        );
    }
    if(chartType === 'bar') {
        if(barLayout === 'vertical') {
            return (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 60 }}>
                      <XAxis dataKey="name" stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" height={60} />
                      <YAxis stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${formatCurrency(Number(value) / 1000)}k`} />
                      {commonTooltip}
                      <Bar dataKey="value" name={title} fill={chartColor} radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            );
        } else {
            const dynamicHeight = Math.max(300, data.length * 40);
            return (
                <ResponsiveContainer width="100%" height={dynamicHeight}>
                    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <XAxis type="number" stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${formatCurrency(Number(value) / 1000)}k`} />
                        <YAxis type="category" dataKey="name" stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} interval={0} width={80} />
                        {commonTooltip}
                        <Bar dataKey="value" name={title} fill={chartColor} radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            )
        }
    }
  }

  return (
    <Card className="h-full grid grid-rows-[auto_1fr]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base drag-handle cursor-move">{title}</CardTitle>
        <div className="flex items-center gap-2">
            <Select value={localAno} onValueChange={handleYearChange} disabled={isPending}>
                <SelectTrigger className="w-[100px] h-8 text-xs">
                    <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {distinctAnos.map(ano => <SelectItem key={ano} value={String(ano)}>{ano}</SelectItem>)}
                </SelectContent>
            </Select>
            <ChartTypeSwitcher value={chartType} onChange={(value) => setChartType(value as ChartType)} />
            {chartType === 'bar' && <ChartLayoutSwitcher value={barLayout} onChange={setBarLayout} />}
            {onRemove && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}>
                    <X className="h-4 w-4 text-muted-foreground" />
                </Button>
            )}
            {isPending ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Move className="h-4 w-4 text-muted-foreground drag-handle cursor-move" />}
        </div>
      </CardHeader>
      <CardContent className="p-4 grid grid-rows-1" style={{gridTemplateRows: 'minmax(0, 1fr)', overflow: 'auto'}}>
          {renderChart()}
      </CardContent>
    </Card>
  );
}

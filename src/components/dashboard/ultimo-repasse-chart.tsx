
"use client";

import { useState } from "react";
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
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { ChartTypeSwitcher, ChartType } from "./chart-type-switcher";
import { ChartLayoutSwitcher, ChartLayout } from "./chart-layout-switcher";
import { Move, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/contexts/DashboardContext";

type ChartData = {
  name: string;
  value: number;
};

export function UltimoRepasseChart({ data, onRemove }: { data: ChartData[], onRemove?: () => void }) {
  const { palette } = useDashboard();
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [barLayout, setBarLayout] = useState<ChartLayout>("vertical");

  const chartDataWithColors = data.map((entry, index) => ({
    ...entry,
    fill: palette[index % palette.length],
  }));
  
  const renderChart = () => {
    if (chartType === "line") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 80 }}>
            <XAxis dataKey="name" stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" height={80} />
            <YAxis stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${formatCurrency(Number(value) / 1000)}k`} />
            <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} formatter={(value) => formatCurrency(Number(value))} />
            <Line type="monotone" dataKey="value" name="Repasse" stroke={palette[0] || "hsl(173, 58%, 39%)"} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      );
    }
    if (chartType === "area") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 80 }}>
            <defs>
              <linearGradient id="repasseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={palette[0] || "hsl(173, 58%, 39%)"} stopOpacity={0.8} />
                <stop offset="95%" stopColor={palette[0] || "hsl(173, 58%, 39%)"} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <XAxis dataKey="name" stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" height={80} />
            <YAxis stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${formatCurrency(Number(value) / 1000)}k`} />
            <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} formatter={(value) => formatCurrency(Number(value))} />
            <Area type="monotone" dataKey="value" name="Repasse" stroke={palette[0] || "hsl(173, 58%, 39%)"} fillOpacity={1} fill="url(#repasseGradient)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      );
    }
    if (chartType === "bar") {
       if (barLayout === 'vertical') {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartDataWithColors} margin={{ top: 5, right: 20, left: 20, bottom: 80 }}>
              <XAxis dataKey="name" stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${formatCurrency(Number(value) / 1000)}k`} />
              <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="value" name="Repasse" radius={[4, 4, 0, 0]}>
                {chartDataWithColors.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
       } else { // horizontal
          const dynamicHeight = Math.max(300, data.length * 40);
          return (
            <ResponsiveContainer width="100%" height={dynamicHeight}>
              <BarChart data={chartDataWithColors} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                <XAxis type="number" stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${formatCurrency(Number(value) / 1000)}k`} />
                <YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false} fontSize={12} interval={0} />
                <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="value" name="Repasse" radius={[0, 4, 4, 0]}>
                    {chartDataWithColors.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )
       }
    }
  };
  
  return (
    <Card className="h-full grid grid-rows-[auto_1fr]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base drag-handle cursor-move">Repasse Consolidado</CardTitle>
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

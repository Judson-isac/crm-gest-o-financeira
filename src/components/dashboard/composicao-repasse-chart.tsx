
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
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { ChartTypeSwitcher, ChartType } from "./chart-type-switcher";
import { ChartLayoutSwitcher, ChartLayout } from "./chart-layout-switcher";
import { Move, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/contexts/DashboardContext";

export function ComposicaoRepasseChart({ data, onRemove }: { data: any[], onRemove?: () => void }) {
  const { palette } = useDashboard();
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [barLayout, setBarLayout] = useState<ChartLayout>("vertical");

  const COLORS = {
    Mensalidade: palette[0] || "hsl(12, 76%, 61%)",
    Acordo: palette[1] || "hsl(173, 58%, 39%)",
    Serviço: palette[2] || "hsl(27, 87%, 67%)",
    Descontos: palette[3] || "hsl(43, 74%, 66%)",
  };

  const renderChart = () => {
    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 80 }}>
            <XAxis dataKey="polo" stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" height={80} />
            <YAxis stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${formatCurrency(Number(value) / 1000)}k`} />
            <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} formatter={(value) => formatCurrency(Number(value))} />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }} />
            <Line type="monotone" dataKey="Mensalidade" stroke={COLORS.Mensalidade} strokeWidth={2} />
            <Line type="monotone" dataKey="Acordo" stroke={COLORS.Acordo} strokeWidth={2} />
            <Line type="monotone" dataKey="Serviço" stroke={COLORS.Serviço} strokeWidth={2} />
            <Line type="monotone" dataKey="Descontos" stroke={COLORS.Descontos} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      );
    }
    if (chartType === 'area') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 80 }}>
            <XAxis dataKey="polo" stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" height={80} />
            <YAxis stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${formatCurrency(Number(value) / 1000)}k`} />
            <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} formatter={(value) => formatCurrency(Number(value))} />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }} />
            <Area type="monotone" dataKey="Mensalidade" stackId="a" stroke={COLORS.Mensalidade} fill={COLORS.Mensalidade} />
            <Area type="monotone" dataKey="Acordo" stackId="a" stroke={COLORS.Acordo} fill={COLORS.Acordo} />
            <Area type="monotone" dataKey="Serviço" stackId="a" stroke={COLORS.Serviço} fill={COLORS.Serviço} />
            <Area type="monotone" dataKey="Descontos" stackId="a" stroke={COLORS.Descontos} fill={COLORS.Descontos} />
          </AreaChart>
        </ResponsiveContainer>
      );
    }
    if (chartType === 'bar') {
      if (barLayout === 'vertical') {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} stackOffset="sign" margin={{ top: 5, right: 20, left: 20, bottom: 80 }}>
              <XAxis type="category" dataKey="polo" stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" height={80} />
              <YAxis type="number" stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${formatCurrency(Number(value) / 1000)}k`} />
              <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} formatter={(value) => formatCurrency(Number(value))} />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }} />
              <Bar dataKey="Mensalidade" stackId="a" fill={COLORS.Mensalidade} />
              <Bar dataKey="Acordo" stackId="a" fill={COLORS.Acordo} />
              <Bar dataKey="Serviço" stackId="a" fill={COLORS.Serviço} />
              <Bar dataKey="Descontos" stackId="a" fill={COLORS.Descontos} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      } else { // horizontal
        const dynamicHeight = Math.max(300, data.length * 40);
        return (
          <ResponsiveContainer width="100%" height={dynamicHeight}>
            <BarChart data={data} layout="vertical" stackOffset="sign" margin={{ top: 5, right: 30, left: 100, bottom: 20 }}>
              <XAxis type="number" stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${formatCurrency(Number(value) / 1000)}k`} />
              <YAxis type="category" dataKey="polo" width={100} tickLine={false} axisLine={false} fontSize={12} interval={0} />
              <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} formatter={(value) => formatCurrency(Number(value))} />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }} />
              <Bar dataKey="Mensalidade" stackId="a" fill={COLORS.Mensalidade} />
              <Bar dataKey="Acordo" stackId="a" fill={COLORS.Acordo} />
              <Bar dataKey="Serviço" stackId="a" fill={COLORS.Serviço} />
              <Bar dataKey="Descontos" stackId="a" fill={COLORS.Descontos} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      }
    }
  };
  
  return (
    <Card className="h-full grid grid-rows-[auto_1fr]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base drag-handle cursor-move">Composição do Repasse</CardTitle>
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

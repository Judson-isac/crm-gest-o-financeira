
"use client";
import { GenericEvolutionChart } from "./generic-evolution-chart";
import type { Filters } from "@/lib/types";
import { useDashboard } from "@/contexts/DashboardContext";

type ChartData = {
  name: string;
  value: number;
};

type DescontosChartProps = {
  data: ChartData[];
  distinctAnos: number[];
  globalFilters: Filters;
  onRemove?: () => void;
};

export function DescontosChart({ data, distinctAnos, globalFilters, onRemove }: DescontosChartProps) {
  const { palette } = useDashboard();
  // Take absolute value for initial charting
  const chartData = data.map(d => ({ ...d, value: Math.abs(d.value) }));
  
  return (
    <GenericEvolutionChart
      title="Descontos Rede"
      tipo="Descontos"
      initialData={chartData}
      distinctAnos={distinctAnos}
      globalFilters={globalFilters}
      chartColor={palette[3] || "hsl(43, 74%, 66%)"}
      gradientId="descontosGradient"
      onRemove={onRemove}
    />
  );
}

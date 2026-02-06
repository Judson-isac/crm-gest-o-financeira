
"use client";
import { GenericEvolutionChart } from "./generic-evolution-chart";
import type { Filters } from "@/lib/types";
import { useDashboard } from "@/contexts/DashboardContext";

type ChartData = {
  name: string;
  value: number;
};

type AcordosChartProps = {
  data: ChartData[];
  distinctAnos: number[];
  globalFilters: Filters;
  onRemove?: () => void;
};

export function AcordosChart({ data, distinctAnos, globalFilters, onRemove }: AcordosChartProps) {
  const { palette } = useDashboard();
  return (
    <GenericEvolutionChart
      title="Acordos Recebidos"
      tipo="Acordo"
      initialData={data}
      distinctAnos={distinctAnos}
      globalFilters={globalFilters}
      chartColor={palette[1] || "hsl(173, 58%, 39%)"}
      gradientId="acordosGradient"
      onRemove={onRemove}
    />
  );
}

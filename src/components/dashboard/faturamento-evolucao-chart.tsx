
"use client";
import { GenericEvolutionChart } from "./generic-evolution-chart";
import type { Filters } from "@/lib/types";
import { useDashboard } from "@/contexts/DashboardContext";

type ChartData = {
  name: string;
  value: number;
};

type FaturamentoEvolucaoChartProps = {
  data: ChartData[];
  distinctAnos: number[];
  globalFilters: Filters;
  onRemove?: () => void;
};

export function FaturamentoEvolucaoChart({ data, distinctAnos, globalFilters, onRemove }: FaturamentoEvolucaoChartProps) {
  const { palette } = useDashboard();
  return (
    <GenericEvolutionChart
      title="Faturamento Rede"
      tipo="Faturamento"
      initialData={data}
      distinctAnos={distinctAnos}
      globalFilters={globalFilters}
      chartColor={palette[0] || "hsl(12, 76%, 61%)"}
      gradientId="faturamentoGradient"
      onRemove={onRemove}
    />
  );
}


"use client";
import { GenericEvolutionChart } from "./generic-evolution-chart";
import type { Filters } from "@/lib/types";
import { useDashboard } from "@/contexts/DashboardContext";

type ChartData = {
  name: string;
  value: number;
};

type MensalidadesChartProps = {
  data: ChartData[];
  distinctAnos: number[];
  globalFilters: Filters;
  onRemove?: () => void;
};

export function MensalidadesChart({ data, distinctAnos, globalFilters, onRemove }: MensalidadesChartProps) {
  const { palette } = useDashboard();
  return (
    <GenericEvolutionChart
      title="Mensalidades Recebidas"
      tipo="Mensalidade"
      initialData={data}
      distinctAnos={distinctAnos}
      globalFilters={globalFilters}
      chartColor={palette[2] || "hsl(197, 37%, 24%)"}
      gradientId="mensalidadeGradient"
      onRemove={onRemove}
    />
  );
}

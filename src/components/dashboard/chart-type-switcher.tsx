'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarChart, LineChart as LineChartIcon, AreaChart as AreaChartIcon, LucideIcon, PieChart } from 'lucide-react';

export type ChartType = 'bar' | 'line' | 'area' | 'pie';

const chartTypes: { value: ChartType, label: string, icon: LucideIcon }[] = [
  { value: 'bar', label: 'Barras', icon: BarChart },
  { value: 'line', label: 'Linha', icon: LineChartIcon },
  { value: 'area', label: 'Área', icon: AreaChartIcon },
  { value: 'pie', label: 'Pizza', icon: PieChart },
];

type ChartTypeSwitcherProps = {
  value: ChartType;
  onChange: (value: ChartType | 'pie') => void;
  className?: string;
};

export function ChartTypeSwitcher({ value, onChange, className }: ChartTypeSwitcherProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`w-auto h-8 text-xs ${className}`}>
        <SelectValue placeholder="Tipo de Gráfico" />
      </SelectTrigger>
      <SelectContent>
        {chartTypes.map(type => (
          <SelectItem key={type.value} value={type.value}>
            <div className="flex items-center gap-2">
              <type.icon className="h-3 w-3 text-muted-foreground" />
              <span>{type.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

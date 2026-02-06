
"use client";
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from '@/lib/utils';
import { ChartLayoutSwitcher, ChartLayout } from "./chart-layout-switcher";
import { Move, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDashboard } from '@/contexts/DashboardContext';

type ChartData = {
  name: string;
  value: number;
};

export function TopCursosChart({ data, onRemove }: { data: ChartData[], onRemove?: () => void }) {
    const { palette } = useDashboard();
    const [barLayout, setBarLayout] = useState<ChartLayout>('horizontal');
    
    const chartDataWithColors = data.map((entry, index) => ({
      ...entry,
      fill: palette[index % palette.length],
    }));

    const renderChart = () => {
        if (barLayout === 'vertical') {
            return (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartDataWithColors} margin={{ top: 5, right: 20, left: 20, bottom: 80 }}>
                        <XAxis dataKey="name" stroke="hsl(var(--foreground))" fontSize={12} interval={0} angle={-45} textAnchor="end" height={80}/>
                        <YAxis tickFormatter={(value) => `${formatCurrency(Number(value) / 1000)}k`} fontSize={12} />
                        <Tooltip cursor={{fill: 'hsl(var(--muted))'}} formatter={(value) => formatCurrency(Number(value))}/>
                        <Bar dataKey="value" name="Faturamento" radius={[4, 4, 0, 0]}>
                           {chartDataWithColors.map((entry) => (
                                <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )
        } else { // horizontal
             return (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={chartDataWithColors} margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                        <XAxis type="number" stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${formatCurrency(Number(value) / 1000)}k`} />
                        <YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false} fontSize={12} interval={0} />
                        <Tooltip cursor={{fill: 'hsl(var(--muted))'}} formatter={(value) => formatCurrency(Number(value))}/>
                        <Bar dataKey="value" name="Faturamento" radius={[0, 4, 4, 0]}>
                            {chartDataWithColors.map((entry) => (
                                <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            );
        }
    }

    return (
        <Card className="h-full grid grid-rows-[auto_1fr]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base drag-handle cursor-move">Top 5 Cursos (Geral)</CardTitle>
                <div className="flex items-center gap-2">
                    <ChartLayoutSwitcher value={barLayout} onChange={setBarLayout} />
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

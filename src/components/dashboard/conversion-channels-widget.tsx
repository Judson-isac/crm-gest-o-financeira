'use client';

import React, { useTransition, useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { getEnrollmentDashboardMetricsAction, ChannelMetric } from "@/actions/enrollment-metrics";
import { Filters } from "@/lib/types";
import { Loader2, PieChart as PieIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(var(--muted-foreground))",
];

export function ConversionChannelsWidget({ filters, onRemove }: { filters: Filters, onRemove?: () => void }) {
    const [data, setData] = useState<ChannelMetric[]>([]);
    const [isLoading, startTransition] = useTransition();

    useEffect(() => {
        startTransition(async () => {
            const result = await getEnrollmentDashboardMetricsAction(filters);
            if (result) {
                setData(result.channels);
            }
        });
    }, [filters]);

    const chartConfig = useMemo(() => {
        const config: any = {};
        data.forEach((item, index) => {
            config[item.name] = {
                label: item.name,
                color: COLORS[index % COLORS.length],
            };
        });
        return config;
    }, [data]);

    return (
        <Card className="h-full flex flex-col overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 drag-handle cursor-move">
                <div>
                    <CardTitle className="text-sm font-medium">Canais de Conversão</CardTitle>
                    <CardDescription className="text-xs">Origem das matrículas</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <PieIcon className="h-4 w-4 text-muted-foreground" />
                    {onRemove && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}>
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px] p-0 pt-4 flex flex-col">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : data.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        Nenhum dado de canal disponível
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px] w-full">
                        <PieChart>
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent hideLabel />}
                            />
                            <Pie
                                data={data}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={60}
                                strokeWidth={5}
                            >
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                    />
                                ))}
                            </Pie>
                            <ChartLegend
                                content={<ChartLegendContent nameKey="name" />}
                                className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                            />
                        </PieChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}

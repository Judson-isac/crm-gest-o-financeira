'use client';

import React, { useTransition, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { getEnrollmentDashboardMetricsAction, PaceDataPoint } from "@/actions/enrollment-metrics";
import { Filters } from "@/lib/types";
import { Loader2, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const chartConfig = {
    atual: {
        label: "Realizado Acumulado",
        color: "hsl(var(--primary))",
    },
    meta: {
        label: "Meta Linear",
        color: "hsl(var(--muted-foreground))",
    },
};

export function EnrollmentPaceWidget({ filters, onRemove }: { filters: Filters, onRemove?: () => void }) {
    const [data, setData] = useState<PaceDataPoint[]>([]);
    const [isLoading, startTransition] = useTransition();

    useEffect(() => {
        startTransition(async () => {
            const result = await getEnrollmentDashboardMetricsAction(filters);
            if (result) {
                setData(result.pace);
            }
        });
    }, [filters]);

    return (
        <Card className="h-full flex flex-col overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 drag-handle cursor-move">
                <div>
                    <CardTitle className="text-sm font-medium">Ritmo de Matrículas</CardTitle>
                    <CardDescription className="text-xs">Crescimento acumulado vs. Meta</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    {onRemove && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}>
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px] p-0 pt-4">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : data.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        Selecione mês e ano para ver o ritmo
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="h-full w-full">
                        <AreaChart
                            data={data}
                            margin={{
                                left: 12,
                                right: 12,
                                top: 12,
                                bottom: 12,
                            }}
                        >
                            <defs>
                                <linearGradient id="fillAtual" x1="0" y1="0" x2="0" y2="1">
                                    <stop
                                        offset="5%"
                                        stopColor="var(--color-atual)"
                                        stopOpacity={0.3}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor="var(--color-atual)"
                                        stopOpacity={0.1}
                                    />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/50" />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                minTickGap={32}
                            />
                            <YAxis
                                hide
                            />
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent indicator="dot" />}
                            />
                            <Area
                                dataKey="atual"
                                type="monotone"
                                fill="url(#fillAtual)"
                                fillOpacity={0.4}
                                stroke="var(--color-atual)"
                                strokeWidth={2}
                                stackId="a"
                            />
                            {data[0]?.meta !== undefined && (
                                <Area
                                    dataKey="meta"
                                    type="monotone"
                                    fill="transparent"
                                    stroke="var(--color-meta)"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    stackId="b"
                                />
                            )}
                        </AreaChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}

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
    const [activeSpace, setActiveSpace] = useState<any>(null);
    const [isLoading, startTransition] = useTransition();

    useEffect(() => {
        startTransition(async () => {
            const result = await getEnrollmentDashboardMetricsAction(filters);
            if (result) {
                setData(result.pace);
                setActiveSpace(result.activeSpace);
            }
        });
    }, [filters]);

    return (
        <Card className="h-full flex flex-col overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 drag-handle cursor-move">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-medium">Ritmo de Matrículas</CardTitle>
                        {activeSpace && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary animate-pulse">
                                <TrendingUp className="h-3 w-3" />
                                FOCO: {activeSpace.name} ({activeSpace.date})
                            </div>
                        )}
                    </div>
                    <CardDescription className="text-xs">Crescimento acumulado vs. Meta Spacepoints</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    {onRemove && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}>
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px] p-0 flex flex-col">
                {/* Ritmo Highlight */}
                {activeSpace && (
                    <div className="px-6 py-3 border-b bg-muted/30 grid grid-cols-3 gap-4">
                        <div>
                            <div className="text-[10px] uppercase font-bold text-muted-foreground">Ritmo Necessário</div>
                            <div className="text-xl font-black text-primary">
                                {activeSpace.requiredPace.toFixed(1)}
                                <span className="text-[10px] ml-1 font-bold opacity-70">POR DIA</span>
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] uppercase font-bold text-muted-foreground">Faltam</div>
                            <div className="text-xl font-black">
                                {Math.ceil(activeSpace.target - (data.find(d => !d.atual) ? data.filter(d => d.atual).slice(-1)[0]?.atual : 0))}
                                <span className="text-[10px] ml-1 font-bold opacity-70">MATRÍCULAS</span>
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] uppercase font-bold text-muted-foreground">Prazo</div>
                            <div className="text-xl font-black">
                                {activeSpace.daysRemaining}
                                <span className="text-[10px] ml-1 font-bold opacity-70">DIAS</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex-1 p-4">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : data.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                            Selecione um Processo, Mês ou Ano para ver o ritmo
                        </div>
                    ) : (
                        <ChartContainer config={chartConfig} className="h-full w-full">
                            <AreaChart
                                data={data}
                                margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
                            >
                                <defs>
                                    <linearGradient id="fillAtual" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-atual)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--color-atual)" stopOpacity={0.1} />
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
                                <YAxis hide />
                                <ChartTooltip
                                    cursor={{ stroke: 'var(--primary)', strokeWidth: 1 }}
                                    content={<ChartTooltipContent indicator="dot" />}
                                />
                                <Area
                                    dataKey="atual"
                                    type="monotone"
                                    fill="url(#fillAtual)"
                                    fillOpacity={0.4}
                                    stroke="var(--color-atual)"
                                    strokeWidth={3}
                                    dot={{ r: 2, fill: "var(--color-atual)" }}
                                    activeDot={{ r: 6 }}
                                />
                                <Area
                                    dataKey="meta"
                                    type="monotone"
                                    fill="transparent"
                                    stroke="var(--color-meta)"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                />
                            </AreaChart>
                        </ChartContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

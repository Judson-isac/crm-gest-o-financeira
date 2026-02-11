'use client';

import React, { useTransition, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { getEnrollmentDashboardMetricsAction, PoloMetric } from "@/actions/enrollment-metrics";
import { Filters } from "@/lib/types";
import { Loader2, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const chartConfig = {
    total: {
        label: "Total Matrículas",
        color: "hsl(var(--primary))",
    },
};

export function PoloPerformanceWidget({ filters, onRemove }: { filters: Filters, onRemove?: () => void }) {
    const [data, setData] = useState<PoloMetric[]>([]);
    const [isLoading, startTransition] = useTransition();

    useEffect(() => {
        startTransition(async () => {
            const result = await getEnrollmentDashboardMetricsAction(filters);
            if (result) {
                setData(result.polos);
            }
        });
    }, [filters]);

    return (
        <Card className="h-full flex flex-col overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 drag-handle cursor-move">
                <div>
                    <CardTitle className="text-sm font-medium">Performance por Polo</CardTitle>
                    <CardDescription className="text-xs">Volume de matrículas por unidade</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
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
                        Nenhum dado de polo disponível
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="h-full w-full">
                        <BarChart
                            data={data}
                            layout="vertical"
                            margin={{
                                left: 40,
                                right: 20,
                                top: 10,
                                bottom: 10,
                            }}
                        >
                            <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-muted/50" />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                width={100}
                                tick={{ fontSize: 11, fontWeight: 500 }}
                            />
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent indicator="line" />}
                            />
                            <Bar
                                dataKey="total"
                                fill="var(--color-total)"
                                radius={[0, 4, 4, 0]}
                                barSize={20}
                            >
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fillOpacity={1 - (index * 0.1)}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}

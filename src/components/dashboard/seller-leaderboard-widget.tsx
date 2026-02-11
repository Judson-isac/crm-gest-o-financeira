'use client';

import React, { useTransition, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getEnrollmentDashboardMetricsAction, LeaderboardMetric } from "@/actions/enrollment-metrics";
import { Filters } from "@/lib/types";
import { Loader2, Trophy, X, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SellerLeaderboardWidget({ filters, onRemove }: { filters: Filters, onRemove?: () => void }) {
    const [data, setData] = useState<LeaderboardMetric[]>([]);
    const [isLoading, startTransition] = useTransition();

    useEffect(() => {
        startTransition(async () => {
            const result = await getEnrollmentDashboardMetricsAction(filters);
            if (result) {
                setData(result.leaderboard);
            }
        });
    }, [filters]);

    const getRankStyles = (index: number) => {
        switch (index) {
            case 0: return "bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400";
            case 1: return "bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-400";
            case 2: return "bg-orange-100 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400";
            default: return "bg-muted/30 border-transparent text-muted-foreground";
        }
    };

    return (
        <Card className="h-full flex flex-col overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 drag-handle cursor-move">
                <div>
                    <CardTitle className="text-sm font-medium">Top Sellers</CardTitle>
                    <CardDescription className="text-xs">Maiores volumes de matrículas</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    {onRemove && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}>
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-2 pt-4">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : data.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        Nenhum vendedor encontrado
                    </div>
                ) : (
                    <div className="space-y-2">
                        {data.map((seller, index) => (
                            <div
                                key={seller.name}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-xl border transition-all hover:translate-x-1",
                                    getRankStyles(index)
                                )}
                            >
                                <div className="relative">
                                    <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                                        <AvatarImage src={seller.avatar} alt={seller.name} className="object-cover" />
                                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                            {seller.name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    {index < 3 && (
                                        <div className="absolute -top-1 -right-1">
                                            <Medal className={cn(
                                                "h-4 w-4 fill-current",
                                                index === 0 ? "text-amber-500" : index === 1 ? "text-slate-400" : "text-orange-500"
                                            )} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold truncate leading-none">{seller.name}</p>
                                    <p className="text-[10px] uppercase font-semibold opacity-70 mt-1">
                                        {index === 0 ? "Campeão de Vendas" : `Posição #${index + 1}`}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-black">{seller.total}</div>
                                    <div className="text-[10px] font-bold uppercase tracking-tight opacity-70">Matrículas</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

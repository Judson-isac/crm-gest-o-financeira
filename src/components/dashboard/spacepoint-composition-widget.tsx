'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getSpacepointCompositionAction, SpacepointCompositionData } from '@/actions/dashboard';
import { Loader2, Users, Target, CheckCircle2, X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SpacepointCompositionWidget({ onRemove, processoFilter }: { onRemove?: () => void, processoFilter?: string }) {
    const [data, setData] = useState<SpacepointCompositionData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (!processoFilter) {
            setIsLoading(false);
            return;
        }

        async function fetchData() {
            setIsLoading(true);
            const result = await getSpacepointCompositionAction(processoFilter as string);
            setData(result);
            setIsLoading(false);
        }

        startTransition(() => {
            fetchData();
        });
    }, [processoFilter]);

    if (!processoFilter) {
        return (
            <Card className="h-full flex flex-col border-dashed relative">
                {onRemove && (
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-10" onClick={onRemove}>
                        <X className="h-4 w-4" />
                    </Button>
                )}
                <div className="flex-1 flex items-center justify-center p-6 text-center">
                    <p className="text-muted-foreground">Selecione um processo seletivo para ver a composição.</p>
                </div>
            </Card>
        );
    }

    if (isLoading) {
        return (
            <Card className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </Card>
        );
    }

    if (!data) {
        return (
            <Card className="h-full flex items-center justify-center relative">
                {onRemove && (
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-10" onClick={onRemove}>
                        <X className="h-4 w-4" />
                    </Button>
                )}
                <p className="text-muted-foreground">Nenhuma meta definida para os polos deste processo.</p>
            </Card>
        );
    }

    return (
        <Card className="h-full flex flex-col group relative overflow-hidden">
            <CardHeader className="pb-3 border-b bg-secondary/20 h-20 shrink-0">
                <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-2 drag-handle cursor-move flex-1">
                        <GripVertical className="h-4 w-4 text-muted-foreground opacity-50" />
                        <div>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                Composição por Polo
                            </CardTitle>
                            <CardDescription className="text-[10px] uppercase font-semibold">
                                Space #{data?.spaceNumber || '-'}
                            </CardDescription>
                        </div>
                    </div>
                    {onRemove && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-1" onClick={onRemove}>
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pt-4 space-y-6">
                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="p-3 bg-secondary/50 rounded-lg text-center">
                        <Target className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <div className="text-xs text-muted-foreground uppercase">Meta Total</div>
                        <div className="text-xl font-bold">{data.totalTarget}</div>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-lg text-center">
                        <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <div className="text-xs text-muted-foreground uppercase">Realizado</div>
                        <div className="text-xl font-bold">{data.totalRealized}</div>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-lg text-center">
                        <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <div className="text-xs text-muted-foreground uppercase">% Total</div>
                        <div className="text-xl font-bold">
                            {data.totalTarget > 0 ? ((data.totalRealized / data.totalTarget) * 100).toFixed(1) : 0}%
                        </div>
                    </div>
                </div>

                <div className="space-y-5">
                    {data.polos.map((polo) => (
                        <div key={polo.name} className="space-y-1.5">
                            <div className="flex justify-between items-end">
                                <span className="text-sm font-medium truncate max-w-[150px]">{polo.name}</span>
                                <div className="text-xs text-right">
                                    <span className="font-bold text-foreground">{polo.realized}</span>
                                    <span className="text-muted-foreground mx-1">/</span>
                                    <span className="text-muted-foreground">{polo.target}</span>
                                    <span className="ml-2 font-semibold text-primary">({polo.percentage.toFixed(0)}%)</span>
                                </div>
                            </div>
                            <Progress value={Math.min(polo.percentage, 100)} className="h-2" />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

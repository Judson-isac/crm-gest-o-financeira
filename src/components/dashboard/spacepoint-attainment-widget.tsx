'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCcw, X, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSpacepointStatsAction, type SpacepointDashboardData } from '@/actions/dashboard';
import { getProcessosSeletivos } from '@/lib/api';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function SpacepointAttainmentWidget({ onRemove }: { onRemove?: () => void }) {
    const [processos, setProcessos] = useState<{ id: string, numero: string, ano: number }[]>([]);
    const [selectedProcesso, setSelectedProcesso] = useState<string>('');
    const [data, setData] = useState<SpacepointDashboardData | null>(null);
    const [isLoading, startTransition] = useTransition();

    useEffect(() => {
        getProcessosSeletivos().then(setProcessos);
    }, []);

    useEffect(() => {
        if (selectedProcesso) {
            startTransition(async () => {
                const result = await getSpacepointStatsAction(selectedProcesso, 'Todos'); // Default to 'Todos' or allow polo filter?
                // For now, assuming Global view or passing 'Todos'. Widget could have internal Polo filter later.
                setData(result);
            });
        }
    }, [selectedProcesso]);

    const formatQuantity = (val: number) => {
        return val.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }

    const formatDecimal = (val: number) => {
        return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    const formatPercent = (val: number) => {
        return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
    }

    if (!processos.length && !isLoading) {
        return (
            <Card className="h-full flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 drag-handle cursor-move">
                    <CardTitle className="text-sm font-medium">Acompanhamento Atingimento</CardTitle>
                    {onRemove && <Button variant="ghost" size="icon" onClick={onRemove}><X className="h-4 w-4" /></Button>}
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                    Carregando processos...
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 drag-handle cursor-move">
                <CardTitle className="text-sm font-medium">Acompanhamento Atingimento</CardTitle>
                <div className="flex items-center gap-2">
                    <Select value={selectedProcesso} onValueChange={setSelectedProcesso}>
                        <SelectTrigger className="w-[180px] h-8 text-xs">
                            <SelectValue placeholder="Selecione Processo" />
                        </SelectTrigger>
                        <SelectContent>
                            {processos.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.numero}/{p.ano}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {onRemove && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}><X className="h-4 w-4" /></Button>}
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : !selectedProcesso ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm p-4">
                        Selecione um processo seletivo para visualizar.
                    </div>
                ) : !data ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm p-4">
                        Nenhum dado encontrado para este processo.
                    </div>
                ) : (
                    <div className="p-2 space-y-4">
                        {/* Header Info */}
                        <div className="grid grid-cols-4 gap-2 text-xs font-semibold bg-muted/50 p-2 rounded-md text-center">
                            <div className="flex flex-col">
                                <span className="text-muted-foreground">HOJE</span>
                                <span>{format(new Date(), 'dd/MM/yyyy')}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-muted-foreground">{data.currentSpaceIndex >= 0 ? `${data.currentSpaceIndex + 1}º SPACE` : 'PRÓXIMO SPACE'}</span>
                                <span>{data.nextSpaceDate ? format(new Date(data.nextSpaceDate), 'dd/MM/yyyy') : '-'}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-muted-foreground">DIAS FALTANTES</span>
                                <span className={cn(data.daysRemaining && data.daysRemaining < 3 ? "text-red-500" : "")}>{data.daysRemaining ?? '-'}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-muted-foreground">META DIA</span>
                                <span className={cn(data.dailyTarget > 0 ? "text-red-500" : "text-green-500")}>
                                    {data.dailyTarget > 0 ? `${formatDecimal(data.dailyTarget)}` : 'OK'}
                                </span>
                            </div>
                        </div>

                        {/* Main Table */}
                        <div className="border rounded-md overflow-x-auto">
                            <Table className="text-xs">
                                <TableHeader>
                                    <TableRow className="bg-primary/5 hover:bg-primary/5">
                                        <TableHead className="w-[50px] font-bold text-primary">SPACE</TableHead>
                                        <TableHead className="w-[100px] font-bold text-primary">PRODUTOS</TableHead>
                                        <TableHead className="text-center font-bold text-primary bg-blue-100/50 dark:bg-blue-900/20">REALIZADO</TableHead>
                                        <TableHead className="text-center font-bold text-primary bg-blue-100/50 dark:bg-blue-900/20">SAVE/GAP</TableHead>
                                        <TableHead className="text-center font-bold text-primary bg-blue-100/50 dark:bg-blue-900/20">%</TableHead>

                                        {data.spaces.map(sp => (
                                            <TableHead key={sp.id} className={cn(
                                                "text-center font-bold whitespace-nowrap transition-colors",
                                                data.currentSpaceIndex + 1 === sp.numeroSpace
                                                    ? "text-primary text-base"
                                                    : "text-muted-foreground"
                                            )}>
                                                {sp.numeroSpace}º SPACE
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.stats.map(row => (
                                        <TableRow key={row.product} className={cn(
                                            "hover:bg-muted/50 transition-colors",
                                            row.product === 'TOTAL' ? "bg-primary/10 font-bold border-t-2 border-primary/20" : "even:bg-muted/30"
                                        )}>
                                            <TableCell className="text-center font-medium">
                                                {data.currentSpaceIndex + 1}º
                                            </TableCell>
                                            <TableCell className="font-medium">{row.product}</TableCell>
                                            <TableCell className="text-center bg-blue-50/50 dark:bg-blue-950/10 text-foreground font-semibold">
                                                {formatQuantity(row.realized)}
                                            </TableCell>
                                            <TableCell className={cn("text-center bg-blue-50/50 dark:bg-blue-950/10 font-bold", row.gap < 0 ? "text-red-500" : "text-green-600")}>
                                                {formatQuantity(row.gap)}
                                            </TableCell>
                                            <TableCell className="relative text-center font-bold">
                                                <div className={cn(
                                                    "absolute inset-0 opacity-20",
                                                    row.percentage >= 100 ? "bg-green-500" : "bg-red-500"
                                                )} style={{ width: `${Math.min(row.percentage, 100)}%` }} />
                                                <span className={cn("relative z-10", row.percentage < 100 ? "text-red-500" : "text-green-600")}>
                                                    {formatPercent(row.percentage)}
                                                </span>
                                            </TableCell>

                                            {row.spaceTargets.map((target, idx) => {
                                                const isCurrentTarget = data.currentSpaceIndex === idx;
                                                const isPast = idx < data.currentSpaceIndex;
                                                const realizedAtSpace = row.spaceRealized?.[idx] || 0; // Use new field

                                                // Current Target: Show Target with Highlight (Card Effect / Shadow)
                                                if (isCurrentTarget) {
                                                    const isHit = row.realized >= target;
                                                    return (
                                                        <TableCell key={idx} className="text-center p-0 relative h-full">
                                                            {/* Card Container for Current Space */}
                                                            <div className={cn(
                                                                "mx-1 my-1 rounded-lg shadow-sm border flex flex-col items-center justify-center py-2 px-1 min-w-[80px]",
                                                                "bg-card text-card-foreground", // Use theme card colors
                                                                isHit ? "border-green-500/50 shadow-green-500/10 ring-1 ring-green-500/20" : "border-primary/50 shadow-primary/10 ring-1 ring-primary/20 bg-blue-50/10"
                                                            )}>
                                                                <span className="text-[9px] uppercase text-muted-foreground font-semibold tracking-wider">Meta</span>
                                                                <span className={cn("text-xl font-black tracking-tight", isHit ? "text-green-600" : "text-primary")}>
                                                                    {formatQuantity(target)}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                    );
                                                }

                                                // Past Space: Show Result/Target with Icons
                                                if (isPast) {
                                                    const hit = realizedAtSpace >= target;
                                                    return (
                                                        <TableCell key={idx} className="text-center p-2">
                                                            <div className={cn(
                                                                "flex flex-col items-center justify-center p-2 rounded-md",
                                                                hit ? "bg-green-100/50 dark:bg-green-900/20 text-green-700 dark:text-green-400" : "bg-red-100/50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                                                            )}>
                                                                {hit ? <CheckCircle2 className="h-5 w-5 mb-1" /> : <XCircle className="h-5 w-5 mb-1" />}
                                                                <span className="font-bold text-sm">{formatQuantity(realizedAtSpace)}/{formatQuantity(target)}</span>
                                                            </div>
                                                        </TableCell>
                                                    );
                                                }

                                                // Future: Show Target (Plain)
                                                return (
                                                    <TableCell key={idx} className="text-center text-muted-foreground">
                                                        {formatQuantity(target)}
                                                    </TableCell>
                                                )
                                            })}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

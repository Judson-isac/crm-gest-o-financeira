'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCcw, X, CheckCircle2, XCircle, CalendarClock, Target, ArrowDown, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
                        {/* Header Info - Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            <Card className="bg-muted/30 border-none shadow-sm">
                                <CardContent className="p-4 flex flex-col items-center justify-center">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Hoje</span>
                                    <div className="flex items-center gap-2">
                                        <CalendarClock className="h-4 w-4 text-primary" />
                                        <span className="text-lg font-bold text-primary">{format(new Date(), 'dd/MM/yyyy')}</span>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-muted/30 border-none shadow-sm">
                                <CardContent className="p-4 flex flex-col items-center justify-center">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                                        {data.currentSpaceIndex >= 0 ? `${data.currentSpaceIndex + 1}º Space` : 'Próximo Space'}
                                    </span>
                                    <span className="text-lg font-bold">{data.nextSpaceDate ? format(new Date(data.nextSpaceDate), 'dd/MM/yyyy') : '-'}</span>
                                </CardContent>
                            </Card>
                            <Card className={cn("border-none shadow-sm", data.daysRemaining && data.daysRemaining < 3 ? "bg-red-50 dark:bg-red-900/10 border-red-200" : "bg-muted/30")}>
                                <CardContent className="p-4 flex flex-col items-center justify-center">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Dias Faltantes</span>
                                    <div className="flex items-center gap-2">
                                        <span className={cn("text-2xl font-black", data.daysRemaining && data.daysRemaining < 3 ? "text-red-600" : "text-primary")}>
                                            {data.daysRemaining ?? '-'}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className={cn("border-none shadow-sm", data.dailyTarget > 0 ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200" : "bg-green-50 dark:bg-green-900/10 border-green-200")}>
                                <CardContent className="p-4 flex flex-col items-center justify-center">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Meta Diária</span>
                                    <div className="flex items-center gap-2">
                                        <Target className={cn("h-5 w-5", data.dailyTarget > 0 ? "text-amber-600" : "text-green-600")} />
                                        <span className={cn("text-2xl font-black", data.dailyTarget > 0 ? "text-amber-600" : "text-green-600")}>
                                            {data.dailyTarget > 0 ? `${formatDecimal(data.dailyTarget)}` : 'OK'}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Main Table */}
                        <div className="border rounded-md overflow-x-auto">
                            <Table className="text-xs">
                                <TableHeader>
                                    {/* Super Headers */}
                                    <TableRow className="bg-muted/50 border-none hover:bg-muted/50">
                                        <TableHead colSpan={2} className="text-center font-bold text-xs uppercase tracking-wider text-muted-foreground border-r">Produto</TableHead>
                                        <TableHead colSpan={3} className="text-center font-bold text-xs uppercase tracking-wider text-muted-foreground border-r bg-blue-50/30 dark:bg-blue-900/10">Desempenho Geral</TableHead>
                                        <TableHead colSpan={data.spaces.length} className="text-center font-bold text-xs uppercase tracking-wider text-muted-foreground">Timeline Spaces</TableHead>
                                    </TableRow>
                                    <TableRow className="bg-background hover:bg-background">
                                        <TableHead className="w-[50px] font-bold text-primary text-center">#</TableHead>
                                        <TableHead className="w-[120px] font-bold text-primary border-r">Categoria</TableHead>

                                        <TableHead className="text-center font-bold text-primary bg-blue-50/50 dark:bg-blue-900/20 w-[100px]">Realizado</TableHead>
                                        <TableHead className="text-center font-bold text-primary bg-blue-50/50 dark:bg-blue-900/20 w-[100px]">Gap</TableHead>
                                        <TableHead className="text-center font-bold text-primary bg-blue-50/50 dark:bg-blue-900/20 w-[150px] border-r">Progresso</TableHead>

                                        {data.spaces.map(sp => (
                                            <TableHead key={sp.id} className={cn(
                                                "text-center font-bold whitespace-nowrap transition-colors px-2",
                                                data.currentSpaceIndex + 1 === sp.numeroSpace
                                                    ? "text-primary text-sm"
                                                    : "text-muted-foreground text-xs"
                                            )}>
                                                {sp.numeroSpace}º Space
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
                                            <TableCell className="text-center font-medium opacity-50 text-xs">
                                                {data.currentSpaceIndex + 1}
                                            </TableCell>
                                            <TableCell className="font-semibold text-sm border-r">{row.product}</TableCell>
                                            <TableCell className="text-center bg-blue-50/30 dark:bg-blue-950/20 text-foreground font-bold text-base">
                                                {formatQuantity(row.realized)}
                                            </TableCell>
                                            <TableCell className={cn("text-center bg-blue-50/30 dark:bg-blue-950/20 font-bold text-sm", row.gap < 0 ? "text-red-500" : "text-green-600")}>
                                                <div className="flex items-center justify-center gap-1">
                                                    {row.gap < 0 ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                                                    {formatQuantity(row.gap)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center bg-blue-50/30 dark:bg-blue-950/20 border-r px-4 py-2">
                                                <div className="flex flex-col justify-center h-full gap-1">
                                                    <div className="flex justify-between items-end w-full text-xs mb-0.5">
                                                        <span className="font-bold text-muted-foreground">{formatPercent(row.percentage)}</span>
                                                    </div>
                                                    <Progress
                                                        value={Math.min(row.percentage, 100)}
                                                        className="h-2 w-full bg-slate-200 dark:bg-slate-800"
                                                        indicatorClassName={cn(
                                                            row.percentage >= 100 ? "bg-green-500" :
                                                                row.percentage >= 80 ? "bg-amber-500" : "bg-red-500"
                                                        )}
                                                    />
                                                </div>
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

                                                // Future: Show Target (Plain Card)
                                                return (
                                                    <TableCell key={idx} className="text-center p-2 opaciy-50">
                                                        <div className="rounded border border-dashed border-muted-foreground/30 p-2 flex flex-col items-center justify-center bg-muted/10">
                                                            <span className="text-[10px] text-muted-foreground uppercase">Meta</span>
                                                            <span className="text-sm font-semibold text-muted-foreground">{formatQuantity(target)}</span>
                                                        </div>
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

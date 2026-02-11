'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Save, ArrowLeft, Search, Calendar, ChevronRight, CheckCircle2, Circle, Trash2, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Usuario, ProcessoSeletivo, Spacepoint, MetaUsuario } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { saveMetasUsuariosAction, getMetasUsuariosAction, saveGlobalMetasUsuariosAction } from '@/actions/cadastros';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type MetasUsuariosManagerProps = {
    usuarios: Usuario[];
    processosSeletivos: ProcessoSeletivo[];
    initialMetas: MetaUsuario[];
};

export function MetasUsuariosManager({ usuarios, processosSeletivos, initialMetas }: MetasUsuariosManagerProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
    const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
    const [selectedProcesso, setSelectedProcesso] = useState<string>(processosSeletivos[0]?.id || '');
    const [weeklyMetas, setWeeklyMetas] = useState<Record<number, number>>({});
    const [isLoadingMetas, setIsLoadingMetas] = useState(false);
    const [allMetas, setAllMetas] = useState<MetaUsuario[]>(initialMetas);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const today = useMemo(() => isMounted ? new Date() : new Date(0), [isMounted]);

    // Helper to check if a user has any metas for the selected process
    const getGoalStatus = (userId: string) => {
        const userMetas = allMetas.filter(m => m.usuarioId === userId && m.processoId === selectedProcesso);
        const hasAnyMeta = userMetas.some(m => m.metaQtd > 0);
        return hasAnyMeta;
    };

    const availableWeeks = useMemo(() => {
        const proc = processosSeletivos.find(p => p.id === selectedProcesso);
        if (!proc || !proc.dataInicial) return [];

        const startDate = new Date(proc.dataInicial);
        const endDate = new Date(proc.dataFinal);
        const weeks: { numero: number, data: Date }[] = [];

        let currentDate = startDate;
        let weekNum = 1;

        // Generate weeks of 7 days until endDate
        while (currentDate <= endDate && weekNum <= 52) { // Safety cap
            weeks.push({
                numero: weekNum,
                data: new Date(currentDate)
            });
            currentDate = addDays(currentDate, 7);
            weekNum++;
        }

        return weeks;
    }, [selectedProcesso, processosSeletivos]);

    // Determine current week number
    const currentWeekNumber = useMemo(() => {
        if (availableWeeks.length === 0) return null;

        // Sort weeks by date (past to future)
        const sortedWeeks = [...availableWeeks].sort((a, b) => a.data.getTime() - b.data.getTime());

        // Find the week that is currently active (today is between week date and next week date)
        for (let i = 0; i < sortedWeeks.length; i++) {
            const currentWeek = sortedWeeks[i];
            const nextWeek = sortedWeeks[i + 1];

            if (nextWeek) {
                if (today >= currentWeek.data && today < nextWeek.data) {
                    return currentWeek.numero;
                }
            } else {
                // Last week case
                if (today >= currentWeek.data) {
                    return currentWeek.numero;
                }
            }
        }
        return null;
    }, [availableWeeks, today]);

    const loadMetas = async (userId: string) => {
        setIsLoadingMetas(true);
        const result = await getMetasUsuariosAction(selectedProcesso, userId);
        if (result.success && result.data) {
            const metasMap: Record<number, number> = {};
            result.data.forEach((m: MetaUsuario) => {
                metasMap[m.numeroSemana] = m.metaQtd;
            });
            setWeeklyMetas(metasMap);
        }
        setIsLoadingMetas(false);
    };

    const handleMetaChange = (semana: number, value: string) => {
        const val = parseInt(value) || 0;
        setWeeklyMetas(prev => ({ ...prev, [semana]: val }));
    };

    const handleApplyToAll = (value: string) => {
        const val = parseInt(value) || 0;
        const newMetas: Record<number, number> = {};
        availableWeeks.forEach(week => {
            newMetas[week.numero] = val;
        });
        setWeeklyMetas(newMetas);
        toast({ title: 'Meta replicada!', description: `Valor ${val} aplicado a todas as ${availableWeeks.length} semanas.` });
    };

    const handleApplyGlobal = (value: string) => {
        const val = parseInt(value) || 0;
        if (!selectedProcesso) return;

        const metasToSave = availableWeeks.map(week => ({
            numeroSemana: week.numero,
            metaQtd: val
        }));

        startTransition(async () => {
            const result = await saveGlobalMetasUsuariosAction(selectedProcesso, metasToSave);
            if (result.success) {
                toast({ title: 'Meta Global Aplicada!', description: `Valor ${val} aplicado a TODOS os vendedores.` });
                // Refresh all metas to update dashboard statuses
                const updatedMetas = await getMetasUsuariosAction(selectedProcesso);
                if (updatedMetas.success) setAllMetas(updatedMetas.data || []);
                router.refresh();
            } else {
                toast({ variant: 'destructive', title: 'Erro ao aplicar meta global', description: result.message });
            }
        });
    };

    const handleSave = () => {
        if (!selectedUsuario || !selectedProcesso) return;

        const metasToSave = Object.entries(weeklyMetas).map(([semana, qtd]) => ({
            numeroSemana: parseInt(semana),
            metaQtd: qtd
        }));

        startTransition(async () => {
            const result = await saveMetasUsuariosAction(selectedUsuario.id, selectedProcesso, metasToSave);
            if (result.success) {
                toast({ title: 'Metas salvas com sucesso!' });
                // Refresh all metas to update dashboard statuses
                const updatedMetas = await getMetasUsuariosAction(selectedProcesso);
                if (updatedMetas.success) setAllMetas(updatedMetas.data || []);
                setView('dashboard');
                router.refresh();
            } else {
                toast({ variant: 'destructive', title: 'Erro ao salvar', description: result.message });
            }
        });
    };

    const openEditor = (user: Usuario) => {
        setSelectedUsuario(user);
        loadMetas(user.id);
        setView('editor');
    };

    if (view === 'dashboard') {
        return (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-full">
                            <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">Metas de Usuários</h2>
                            <p className="text-muted-foreground">Distribuição de metas semanais por vendedor.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Label htmlFor="dashboard-processo" className="text-sm font-medium whitespace-nowrap">Processo Seletivo:</Label>
                        <Select value={selectedProcesso} onValueChange={setSelectedProcesso}>
                            <SelectTrigger id="dashboard-processo" className="w-[180px] font-semibold border-2">
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                {processosSeletivos.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.numero}/{p.ano}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 dark:from-indigo-900 dark:via-blue-900 dark:to-indigo-950 rounded-2xl p-8 text-white shadow-2xl border border-white/10 relative overflow-hidden group mb-8">
                    {/* Background decoration elements */}
                    <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                        <Zap size={240} />
                    </div>
                    <div className="absolute -left-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                        <div className="max-w-xl">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="bg-amber-400 text-amber-950 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                                    Ação Global
                                </div>
                            </div>
                            <h3 className="text-3xl font-black tracking-tighter flex items-center gap-3 italic">
                                META GLOBAL
                                <span className="text-blue-200 not-italic font-light">(TODOS OS VENDEDORES)</span>
                            </h3>
                            <p className="text-blue-50 text-base mt-3 leading-relaxed font-medium max-w-lg">
                                Potencialize a operação definindo um objetivo único para <span className="underline decoration-amber-400 decoration-2 underline-offset-4 font-bold">todas as semanas</span> de <span className="underline decoration-amber-400 decoration-2 underline-offset-4 font-bold">todos os usuários</span> simultaneamente.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-end gap-4 bg-white/10 p-6 rounded-2xl border border-white/20 backdrop-blur-md shadow-inner">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="global-goal" className="text-xs font-black text-blue-100 uppercase tracking-wider ml-1">Valor do Objetivo</Label>
                                <Input
                                    id="global-goal"
                                    type="number"
                                    placeholder="Ex: 5"
                                    className="w-32 h-14 text-center text-2xl font-black text-indigo-950 dark:text-blue-50 bg-white/90 dark:bg-slate-950/50 border-0 rounded-xl shadow-lg focus-visible:ring-amber-400 transition-all"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            disabled={isPending || availableWeeks.length === 0}
                                            className="h-14 px-8 bg-amber-400 text-amber-950 hover:bg-amber-300 font-black text-base shadow-lg hover:shadow-amber-400/20 active:scale-95 transition-all rounded-xl border-b-4 border-amber-600"
                                        >
                                            {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "APLICAR EM TUDO"}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="border-2 border-indigo-100 dark:border-indigo-900 rounded-2xl bg-background shadow-2xl">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="text-2xl font-black text-indigo-900 dark:text-indigo-100">Confirmar Ação Global?</AlertDialogTitle>
                                            <AlertDialogDescription className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                                                Esta ação irá **sobrescrever as metas de todos os vendedores** em todas as semanas do processo {processosSeletivos.find(p => p.id === selectedProcesso)?.numero}/{processosSeletivos.find(p => p.id === selectedProcesso)?.ano}.
                                                <br /><br />
                                                <span className="text-amber-600 dark:text-amber-400 font-bold block bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200 dark:border-amber-900">
                                                    ⚠️ Esta operação não pode ser desfeita individualmente.
                                                </span>
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className="gap-2">
                                            <AlertDialogCancel className="rounded-xl border-2 font-bold h-12 dark:bg-slate-800 dark:border-slate-700">Cancelar</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => {
                                                    const input = document.getElementById('global-goal') as HTMLInputElement;
                                                    handleApplyGlobal(input.value);
                                                    input.value = '';
                                                }}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold px-8 h-12 shadow-lg shadow-indigo-200"
                                            >
                                                Confirmar e Aplicar
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="outline"
                                        disabled={isPending || availableWeeks.length === 0}
                                        className="h-14 w-14 p-0 bg-white/10 hover:bg-red-500 hover:text-white border-white/30 text-white transition-all rounded-xl shadow-md group/trash" title="Zerar Todas as Metas"
                                    >
                                        <Trash2 className="h-6 w-6 group-hover/trash:scale-110 transition-transform" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="border-2 border-red-100 dark:border-red-900 rounded-2xl bg-background shadow-2xl">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-2xl font-black text-red-700 dark:text-red-400 uppercase tracking-tight">ZERAR TODAS AS METAS?</AlertDialogTitle>
                                        <AlertDialogDescription className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                                            Você está prestes a definir a meta como **ZERO** para todos os vendedores e todas as semanas deste processo.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="gap-2">
                                        <AlertDialogCancel className="rounded-xl border-2 font-bold h-12 dark:bg-slate-800 dark:border-slate-700">Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => handleApplyGlobal('0')}
                                            className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white rounded-xl font-bold px-8 h-12 shadow-lg shadow-red-200 dark:shadow-red-900/20"
                                        >
                                            Sim, Zerar Tudo
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                </div>

                <Card className="overflow-hidden border-2">
                    <CardHeader className="bg-muted/30 pb-4">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">Gestão de Vendedores</CardTitle>
                            <div className="text-xs text-muted-foreground bg-background px-2 py-1 rounded border">
                                Hoje: <span className="font-bold">{format(today, "PP", { locale: ptBR })}</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/10">
                                    <TableHead className="px-6 font-bold text-foreground">VENDEDOR</TableHead>
                                    <TableHead className="font-bold text-foreground">FUNÇÃO</TableHead>
                                    <TableHead className="text-center font-bold text-foreground w-[200px]">STATUS DA META</TableHead>
                                    <TableHead className="text-right px-6 font-bold text-foreground">AÇÕES</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {usuarios.filter(u => !u.isSuperadmin).map((user) => {
                                    const assigned = getGoalStatus(user.id);
                                    return (
                                        <TableRow key={user.id} className="hover:bg-muted/5 transition-colors group">
                                            <TableCell className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                                                        <AvatarImage src={user.avatarUrl} alt={user.nome} />
                                                        <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                                                            {user.nome.substring(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-base">{user.nome}</span>
                                                        <span className="text-[10px] text-muted-foreground uppercase font-medium">{user.email}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground font-medium">{user.funcao}</TableCell>
                                            <TableCell className="text-center">
                                                {assigned ? (
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                        Definida
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-widest">
                                                        <Circle className="h-3 w-3" />
                                                        Pendente
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right px-6">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openEditor(user)}
                                                    className="group-hover:bg-blue-50 group-hover:text-blue-700 font-bold"
                                                >
                                                    Gerenciar <ChevronRight className="ml-1 h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
                <Button variant="outline" size="sm" onClick={() => setView('dashboard')} className="font-bold">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Painel Geral
                </Button>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-blue-500/5 p-1.5 rounded-md border border-blue-500/10 italic">
                        <Label htmlFor="batch-goal" className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase px-2">Meta Rápida (todas):</Label>
                        <div className="flex gap-1">
                            <Input
                                id="batch-goal"
                                type="number"
                                placeholder="..."
                                className="w-16 h-8 text-center font-bold"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleApplyToAll((e.target as HTMLInputElement).value);
                                        (e.target as HTMLInputElement).value = '';
                                    }
                                }}
                            />
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-blue-700 hover:bg-blue-100"
                                onClick={() => {
                                    const input = document.getElementById('batch-goal') as HTMLInputElement;
                                    handleApplyToAll(input.value);
                                    input.value = '';
                                }}
                            >
                                Ok
                            </Button>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Data de Referência Real</span>
                        <span className="text-sm font-bold text-blue-700 underline underline-offset-4 decoration-blue-200">
                            {format(today, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </span>
                    </div>
                </div>
            </div>

            <Card className="border-2 shadow-lg">
                <CardHeader className="border-b bg-muted/20">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                Metas Semanais: <span className="text-blue-600 underline decoration-blue-100">{selectedUsuario?.nome}</span>
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                                Processo Seletivo {processosSeletivos.find(p => p.id === selectedProcesso)?.numero}/{processosSeletivos.find(p => p.id === selectedProcesso)?.ano}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoadingMetas ? (
                        <div className="flex h-64 items-center justify-center">
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                                <p className="text-sm font-medium text-muted-foreground">Carregando períodos...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/10 border-b">
                                        <TableHead className="px-6 w-[200px] font-bold">SEMANA</TableHead>
                                        <TableHead className="font-bold">PERÍODO / INÍCIO</TableHead>
                                        <TableHead className="text-center font-bold px-6">META (QTD. MATRÍCULAS)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {availableWeeks.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-48 text-center bg-muted/5">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Search className="h-8 w-8 text-muted-foreground/30" />
                                                    <p className="text-muted-foreground font-medium">Nenhuma semana configurada para este processo.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        availableWeeks.map((week) => {
                                            const isTodayWeek = week.numero === currentWeekNumber;
                                            return (
                                                <TableRow
                                                    key={week.numero}
                                                    className={cn(
                                                        "group transition-colors",
                                                        isTodayWeek ? "bg-blue-50 hover:bg-blue-100/80" : "hover:bg-muted/5 text-muted-foreground hover:text-foreground"
                                                    )}
                                                >
                                                    <TableCell className="px-6 py-5">
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn(
                                                                "text-lg font-bold",
                                                                isTodayWeek ? "text-blue-700" : "text-foreground"
                                                            )}>
                                                                Semana {week.numero}
                                                            </span>
                                                            {isTodayWeek && (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black bg-blue-600 text-white uppercase tracking-tighter animate-pulse">
                                                                    Hoje
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className={cn("text-base", isTodayWeek ? "font-bold text-blue-900" : "font-medium")}>
                                                                {format(week.data, "dd 'de' MMMM", { locale: ptBR })}
                                                            </span>
                                                            {isTodayWeek && <span className="text-[10px] text-blue-600 uppercase font-black">Esta é a semana atual</span>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center px-6">
                                                        <div className="flex justify-center">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                className={cn(
                                                                    "w-24 text-center text-lg font-black bg-background shadow-sm ring-blue-500",
                                                                    isTodayWeek ? "border-2 border-blue-500 ring-2 ring-blue-100 h-12" : "h-11 border-muted group-hover:border-foreground"
                                                                )}
                                                                value={weeklyMetas[week.numero] ?? 0}
                                                                onChange={(e) => handleMetaChange(week.numero, e.target.value)}
                                                            />
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>

                            <div className="flex items-center justify-between p-6 bg-muted/20 border-t">
                                <Button variant="ghost" onClick={() => setView('dashboard')} className="font-semibold text-muted-foreground hover:text-foreground">
                                    Descartar Alterações
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={isPending || availableWeeks.length === 0}
                                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-[200px] h-12 text-base font-bold shadow-lg shadow-blue-200"
                                >
                                    {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                                    Salvar Metas de {selectedUsuario?.nome}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="bg-blue-500/5 p-4 rounded-lg border border-blue-500/10 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="text-xs text-blue-800 space-y-1">
                    <p className="font-bold uppercase tracking-wider">Dica:</p>
                    <p>As metas são salvas individualmente para cada vendedor. O destaque azul indica em qual semana vocês estão hoje, facilitando o acompanhamento.</p>
                </div>
            </div>
        </div>
    );
}

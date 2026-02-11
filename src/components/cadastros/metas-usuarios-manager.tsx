'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Save, ArrowLeft, Search, Calendar, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Usuario, ProcessoSeletivo, Spacepoint, MetaUsuario } from '@/lib/types';
import { saveMetasUsuariosAction, getMetasUsuariosAction } from '@/actions/cadastros';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type MetasUsuariosManagerProps = {
    usuarios: Usuario[];
    processosSeletivos: ProcessoSeletivo[];
    allSpacepoints: Spacepoint[];
    initialMetas: MetaUsuario[];
};

export function MetasUsuariosManager({ usuarios, processosSeletivos, allSpacepoints, initialMetas }: MetasUsuariosManagerProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
    const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
    const [selectedProcesso, setSelectedProcesso] = useState<string>(processosSeletivos[0]?.id || '');
    const [weeklyMetas, setWeeklyMetas] = useState<Record<number, number>>({});
    const [isLoadingMetas, setIsLoadingMetas] = useState(false);
    const [allMetas, setAllMetas] = useState<MetaUsuario[]>(initialMetas);

    const today = new Date();

    // Helper to check if a user has any metas for the selected process
    const getGoalStatus = (userId: string) => {
        const userMetas = allMetas.filter(m => m.usuarioId === userId && m.processoId === selectedProcesso);
        const hasAnyMeta = userMetas.some(m => m.metaQtd > 0);
        return hasAnyMeta;
    };

    const availableSpaces = useMemo(() => {
        if (!selectedProcesso) return [];
        const processSpaces = allSpacepoints.filter(sp => sp.processoSeletivo === selectedProcesso);

        const weeksMap = new Map<number, Date>();
        processSpaces.sort((a, b) => a.numeroSpace - b.numeroSpace).forEach(sp => {
            if (!weeksMap.has(sp.numeroSpace) || !sp.polo) {
                weeksMap.set(sp.numeroSpace, new Date(sp.dataSpace));
            }
        });

        return Array.from(weeksMap.entries())
            .map(([num, date]) => ({
                numero: num,
                data: date
            }))
            .sort((a, b) => a.data.getTime() - b.data.getTime());
    }, [selectedProcesso, allSpacepoints]);

    // Determine current week number
    const currentWeekNumber = useMemo(() => {
        if (availableSpaces.length === 0) return null;

        // Sort weeks by date (past to future)
        const sortedWeeks = [...availableSpaces].sort((a, b) => a.data.getTime() - b.data.getTime());

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
    }, [availableSpaces, today]);

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
                if (updatedMetas.success) setAllMetas(updatedMetas.data);
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-full">
                            <Calendar className="h-6 w-6 text-blue-600" />
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

                <Card className="overflow-hidden border-2">
                    <CardHeader className="bg-muted/30 pb-4">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">Gestão de Vendedores</CardTitle>
                            <div className="text-xs text-muted-foreground bg-white px-2 py-1 rounded border">
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
                                            <TableCell className="px-6 py-4 font-semibold text-base">{user.nome}</TableCell>
                                            <TableCell className="text-muted-foreground">{user.funcao}</TableCell>
                                            <TableCell className="text-center">
                                                {assigned ? (
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                        Definida
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-50 text-yellow-700 border border-yellow-200 uppercase tracking-widest">
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
            <div className="flex items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
                <Button variant="outline" size="sm" onClick={() => setView('dashboard')} className="font-bold">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Painel Geral
                </Button>
                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Data de Referência Real</span>
                    <span className="text-sm font-bold text-blue-700 underline underline-offset-4 decoration-blue-200">
                        {format(today, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </span>
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
                                    {availableSpaces.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-48 text-center bg-gray-50/50">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Search className="h-8 w-8 text-muted-foreground/30" />
                                                    <p className="text-muted-foreground font-medium">Nenhuma semana configurada para este processo.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        availableSpaces.map((week) => {
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
                                                                    "w-24 text-center text-lg font-black bg-white shadow-sm ring-blue-500",
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
                                    disabled={isPending || availableSpaces.length === 0}
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

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-xs text-blue-800 space-y-1">
                    <p className="font-bold uppercase tracking-wider">Dica:</p>
                    <p>As metas são salvas individualmente para cada vendedor. O destaque azul indica em qual semana vocês estão hoje, facilitando o acompanhamento.</p>
                </div>
            </div>
        </div>
    );
}

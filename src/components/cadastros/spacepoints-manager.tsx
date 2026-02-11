'use client';

import React, { useState, useTransition, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlusCircle, ArrowLeft, Trash2, Plus, Save, Database, CheckCircle2, Circle, Calendar, Target, LayoutDashboard } from 'lucide-react';
import { saveSpacepointsAction, deleteSpacepointsAction, syncSpacepointsStructureAction, getPolosSpacepointStatusAction } from '@/actions/cadastros';
import { cn } from '@/lib/utils';
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
import type { Spacepoint as DbSpacepoint, TipoCurso, ProcessoSeletivo } from '@/lib/types';
import { format, addDays } from 'date-fns';

type EditorSpacepoint = {
    id: string; // Use string for temp IDs too
    numeroSpace: number;
    date: Date | undefined;
    metaTotal: number;
    metasPorTipo: Record<string, string>; // Key: Tipo ID, Value: string input
};

function SpacepointsEditor({
    initialProcesso,
    initialPolo,
    onBack,
    onSaveSuccess,
    allProcessos,
    processoObjects,
    allSpacepoints,
    tiposCurso,
    polos,
}: {
    initialProcesso: string | null;
    initialPolo?: string;
    onBack: () => void;
    onSaveSuccess: () => void;
    allProcessos: string[];
    processoObjects: ProcessoSeletivo[];
    allSpacepoints: DbSpacepoint[];
    tiposCurso: TipoCurso[];
    polos: string[];
}) {
    const { toast } = useToast();
    const [selectedProcesso, setSelectedProcesso] = useState<string>(initialProcesso || '');
    const [selectedPolo, setSelectedPolo] = useState<string>(initialPolo || (polos.length > 0 ? polos[0] : ''));
    const [activeTab, setActiveTab] = useState<'estrutura' | 'metas'>('estrutura');
    const [spacepoints, setSpacepoints] = useState<EditorSpacepoint[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, startSavingTransition] = useTransition();
    const [poloStatuses, setPoloStatuses] = useState<Record<string, boolean>>({});

    // Shared dates across all polos for this process
    const [sharedDates, setSharedDates] = useState<Record<number, Date | undefined>>({});

    const loadPoloStatuses = useCallback(async () => {
        if (!selectedProcesso) return;
        const result = await getPolosSpacepointStatusAction(selectedProcesso);
        if (result.success && result.statuses) {
            setPoloStatuses(result.statuses);
        }
    }, [selectedProcesso]);

    const handleLoadData = useCallback((processoId: string, poloName: string) => {
        if (!processoId) return;
        setIsLoading(true);

        setTimeout(() => {
            const allForProcess = allSpacepoints.filter(sp => sp.processoSeletivo === processoId);

            const dateMap: Record<number, Date | undefined> = {};
            // Always establish a master structure from all existing records
            allForProcess.forEach(sp => {
                if (sp.dataSpace && !dateMap[sp.numeroSpace]) {
                    dateMap[sp.numeroSpace] = new Date(sp.dataSpace);
                }
            });
            setSharedDates(dateMap);

            // Load metas for the selected polo
            const dataForPolo = allForProcess
                .filter(sp => sp.polo === poloName)
                .sort((a, b) => a.numeroSpace - b.numeroSpace);

            const spaceNumbers = Array.from(new Set(allForProcess.map(sp => sp.numeroSpace))).sort((a, b) => a - b);
            if (spaceNumbers.length === 0) spaceNumbers.push(1, 2, 3);

            const editorData = spaceNumbers.map(num => {
                const sp = dataForPolo.find(s => s.numeroSpace === num);
                const dynamicMetas: Record<string, string> = {};
                tiposCurso.forEach(tc => {
                    const key = tc.nome.toUpperCase();
                    const val = sp?.metasPorTipo?.[key];
                    dynamicMetas[tc.id] = (val !== undefined && val !== null) ? String(val) : '0';
                });

                return {
                    id: sp?.id || `temp_${num}_${Date.now()}`,
                    numeroSpace: num,
                    date: dateMap[num],
                    metaTotal: sp?.metaTotal || 0,
                    metasPorTipo: dynamicMetas
                };
            });

            setSpacepoints(editorData);
            setIsLoading(false);
        }, 100);
    }, [allSpacepoints, tiposCurso]);

    useEffect(() => {
        if (selectedProcesso) {
            handleLoadData(selectedProcesso, selectedPolo);
            loadPoloStatuses();
        }
    }, [selectedProcesso, selectedPolo, handleLoadData, loadPoloStatuses]);

    const handleAutoGenerateWeeks = () => {
        const proc = processoObjects.find(p => p.id === selectedProcesso);
        if (!proc || !proc.dataInicial) {
            toast({ variant: 'destructive', title: 'Erro', description: 'O processo selecionado não possui data inicial cadastrada.' });
            return;
        }

        const startDate = new Date(proc.dataInicial);
        const endDate = new Date(proc.dataFinal);
        const newSpacepoints: EditorSpacepoint[] = [];

        let currentDate = startDate;
        let weekNum = 1;

        while (currentDate <= endDate && weekNum <= 52) { // Safety cap at 52 weeks
            const initialMetas: Record<string, string> = {};
            tiposCurso.forEach(tc => initialMetas[tc.id] = '0');

            newSpacepoints.push({
                id: `auto_${weekNum}_${Date.now()}`,
                numeroSpace: weekNum,
                date: currentDate,
                metaTotal: 0,
                metasPorTipo: initialMetas
            });

            currentDate = addDays(currentDate, 7);
            weekNum++;
        }

        setSpacepoints(newSpacepoints);
        toast({ title: 'Sucesso!', description: `${newSpacepoints.length} spacepoints gerados (7 em 7 dias).` });
    };

    const handleAddRow = () => {
        const nextNum = spacepoints.length > 0 ? Math.max(...spacepoints.map(s => s.numeroSpace)) + 1 : 1;
        const initialMetas: Record<string, string> = {};
        tiposCurso.forEach(tc => initialMetas[tc.id] = '0');

        setSpacepoints([...spacepoints, {
            id: `temp_${nextNum}_${Date.now()}`,
            numeroSpace: nextNum,
            date: undefined,
            metaTotal: 0,
            metasPorTipo: initialMetas
        }]);
    };

    const handleRemoveRow = (id: string) => {
        setSpacepoints(spacepoints.filter(sp => sp.id !== id));
    };

    const handleClearAll = () => {
        setSpacepoints([]);
        toast({ title: 'Lista limpa', description: 'Todos os spacepoints foram removidos da visualização (não do banco).' });
    };

    const handleDeleteFromDatabase = () => {
        if (!selectedProcesso) return;

        startSavingTransition(async () => {
            const result = await deleteSpacepointsAction(selectedProcesso, selectedPolo);
            if (result.success) {
                toast({ title: 'Sucesso!', description: `Todas as metas do polo ${selectedPolo} foram apagadas do banco.` });
                setSpacepoints([]);
                // Reload data to refresh indicators
                loadPoloStatuses();
                handleLoadData(selectedProcesso, selectedPolo);
            } else {
                toast({ variant: 'destructive', title: 'Erro!', description: result.message });
            }
        });
    };

    const handleSyncStructure = () => {
        if (!selectedProcesso) return;

        const milestonesToSync = spacepoints
            .filter(sp => sp.date)
            .map(sp => ({
                numeroSpace: sp.numeroSpace,
                dataSpace: sp.date!
            }));

        if (milestonesToSync.length === 0) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Defina pelo menos uma semana com data para sincronizar.' });
            return;
        }

        startSavingTransition(async () => {
            const result = await syncSpacepointsStructureAction(selectedProcesso, milestonesToSync);
            if (result.success) {
                toast({ title: 'Sucesso!', description: 'Estrutura sincronizada com todos os polos da rede.' });
                handleLoadData(selectedProcesso, selectedPolo);
            } else {
                toast({ variant: 'destructive', title: 'Erro!', description: result.message });
            }
        });
    };

    const handleRenumberByDate = () => {
        if (spacepoints.length === 0) return;

        const sorted = [...spacepoints].sort((a, b) => {
            if (!a.date) return 1;
            if (!b.date) return -1;
            return a.date.getTime() - b.date.getTime();
        });

        const renumbered = sorted.map((sp, idx) => ({
            ...sp,
            numeroSpace: idx + 1
        }));

        setSpacepoints(renumbered);
        toast({ title: 'Spacepoints renumerados', description: 'A ordem foi ajustada cronologicamente.' });
    };

    const handleDateChange = (id: string, newDate: Date | undefined) => {
        setSpacepoints(prev => prev.map(sp => sp.id === id ? { ...sp, date: newDate } : sp));
    };

    const handleChange = (id: string, tipoId: string, value: string) => {
        setSpacepoints(prev => prev.map(sp => {
            if (sp.id !== id) return sp;
            return {
                ...sp,
                metasPorTipo: { ...sp.metasPorTipo, [tipoId]: value }
            };
        }));
    };

    const getTotal = (sp: EditorSpacepoint) => {
        let total = 0;
        Object.values(sp.metasPorTipo).forEach(v => total += (Number(v) || 0));
        return total;
    };

    const handleSave = () => {
        const spacepointsToSave = spacepoints
            .filter(sp => sp.date)
            .map(sp => {
                const metasToSave: Record<string, number> = {};
                tiposCurso.forEach(tc => {
                    metasToSave[tc.nome.toUpperCase()] = Number(sp.metasPorTipo[tc.id]) || 0;
                });

                return {
                    numeroSpace: sp.numeroSpace,
                    dataSpace: sp.date!,
                    metaTotal: getTotal(sp),
                    metasPorTipo: metasToSave
                };
            });

        if (spacepointsToSave.length === 0 && spacepoints.length > 0) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Preencha as datas dos spaces.' });
            return;
        }

        startSavingTransition(async () => {
            const result = await saveSpacepointsAction(selectedProcesso, spacepointsToSave, selectedPolo);
            if (result.success) {
                toast({ title: 'Sucesso!', description: `Metas do polo ${selectedPolo} salvos com sucesso.` });
                loadPoloStatuses();
            } else {
                toast({ variant: 'destructive', title: 'Erro!', description: result.message });
            }
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-card p-4 rounded-xl border shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                        <LayoutDashboard className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-foreground uppercase tracking-tight">Gestor de Metas</h1>
                        <p className="text-xs text-muted-foreground font-bold">PROCESSO: <span className="text-primary">{processoObjects.find(p => p.id === selectedProcesso)?.numero}/{processoObjects.find(p => p.id === selectedProcesso)?.ano}</span></p>
                    </div>
                </div>
                <Button variant="ghost" className="font-bold text-xs uppercase" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* SIdebar de Polos */}
                <div className="lg:col-span-3 space-y-4">
                    <Card className="overflow-hidden border-none shadow-md">
                        <CardHeader className="bg-muted/50 py-4">
                            <CardTitle className="text-sm font-black uppercase tracking-wider">Polos da Rede</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[600px]">
                                <div className="p-2 space-y-1">
                                    {polos.map(poloName => (
                                        <button
                                            key={poloName}
                                            onClick={() => setSelectedPolo(poloName)}
                                            className={cn(
                                                "w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-bold transition-all",
                                                selectedPolo === poloName
                                                    ? "bg-primary text-primary-foreground shadow-lg scale-[1.02]"
                                                    : "hover:bg-muted text-muted-foreground"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                {poloStatuses[poloName] ? (
                                                    <CheckCircle2 className={cn("h-4 w-4", selectedPolo === poloName ? "text-primary-foreground" : "text-green-500")} />
                                                ) : (
                                                    <Circle className="h-4 w-4 opacity-20" />
                                                )}
                                                {poloName}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>

                {/* Área de Edição */}
                <div className="lg:col-span-9">
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
                        <div className="flex justify-between items-center bg-card p-2 rounded-xl border shadow-sm">
                            <TabsList className="grid grid-cols-2 w-[400px]">
                                <TabsTrigger value="estrutura" className="font-bold flex gap-2">
                                    <Calendar className="h-4 w-4" /> 1. ESTRUTURA
                                </TabsTrigger>
                                <TabsTrigger value="metas" className="font-bold flex gap-2">
                                    <Target className="h-4 w-4" /> 2. METAS
                                </TabsTrigger>
                            </TabsList>

                            <div className="flex items-center gap-2 pr-2">
                                {activeTab === 'metas' && (
                                    <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary font-black px-3 py-1">
                                        POLO ATUAL: {selectedPolo}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <TabsContent value="estrutura" className="mt-0">
                            <Card className="border-none shadow-md overflow-hidden">
                                <CardHeader className="border-b bg-muted/30">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <CardTitle className="text-lg font-black uppercase">Calendário Master</CardTitle>
                                            <CardDescription className="font-bold text-xs uppercase opacity-70">Defina as datas e o número de Spacepoints para sincronizar com todos os polos</CardDescription>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={handleRenumberByDate} className="font-bold uppercase text-[10px] h-8">Sincronizar Cronograma</Button>
                                            <Button variant="outline" size="sm" onClick={handleClearAll} className="font-bold uppercase text-[10px] h-8 border-red-200 text-red-600">Zerar</Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow className="hover:bg-transparent border-none">
                                                <TableHead className="font-black text-[10px] uppercase h-10 px-6">Posição</TableHead>
                                                <TableHead className="font-black text-[10px] uppercase h-10 px-6">Data de Entrega (Spacepoint)</TableHead>
                                                <TableHead className="font-black text-[10px] uppercase h-10 px-6 text-right">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {spacepoints.map((sp, idx) => (
                                                <TableRow key={sp.id} className={cn("px-6", sp.numeroSpace === spacepoints.length ? "bg-primary/5" : "")}>
                                                    <TableCell className="px-6">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-xs">
                                                                {sp.numeroSpace}
                                                            </div>
                                                            {sp.numeroSpace === spacepoints.length && <Badge className="text-[10px] bg-primary h-5">META FINAL</Badge>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-6">
                                                        <DatePicker value={sp.date} onValueChange={(d) => handleDateChange(sp.id, d)} />
                                                    </TableCell>
                                                    <TableCell className="px-6 text-right">
                                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveRow(sp.id)} className="text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow className="hover:bg-transparent border-none">
                                                <TableCell colSpan={3} className="p-4 px-6">
                                                    <Button variant="outline" onClick={handleAddRow} className="w-full border-dashed py-6 group hover:border-primary transition-all">
                                                        <Plus className="mr-2 h-4 w-4 group-hover:scale-125 transition-transform" />
                                                        Adicionar novo Spacepoint
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </CardContent>
                                <div className="p-4 bg-muted/30 border-t flex justify-between items-center">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">⚠️ AO SINCRONIZAR, TODOS OS POLOS TERÃO ESSAS DATAS.</p>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button disabled={isSaving} className="bg-primary hover:bg-primary/90 font-black uppercase text-xs px-8">Salvar e Sincronizar Calendário</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Sincronizar Estrutura?</AlertDialogTitle>
                                                <AlertDialogDescription>Isso vai atualizar o calendário de todos os polos da rede para este processo.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Voltar</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleSyncStructure}>Sincronizar Rede</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="metas" className="mt-0">
                            <Card className="border-none shadow-md overflow-hidden">
                                <CardHeader className="border-b bg-muted/30">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <CardTitle className="text-lg font-black uppercase">Metas do Polo: {selectedPolo}</CardTitle>
                                            <CardDescription className="font-bold text-xs uppercase opacity-70">Preencha as metas quantitativas para cada marco</CardDescription>
                                        </div>
                                        <div className="flex gap-2">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="outline" size="sm" className="font-bold uppercase text-[10px] h-8 border-red-200 text-red-600">Limpar Banco</Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>Apagar Dados?</AlertDialogTitle><AlertDialogDescription>Isso remove todas as metas deste polo no banco.</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel>Não</AlertDialogCancel><AlertDialogAction onClick={handleDeleteFromDatabase} className="bg-red-600">Sim, Apagar</AlertDialogAction></AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow className="hover:bg-transparent border-none">
                                                <TableHead className="font-black text-[10px] uppercase h-10 px-6">Space</TableHead>
                                                <TableHead className="font-black text-[10px] uppercase h-10 px-6">Data</TableHead>
                                                {tiposCurso.map(tc => (
                                                    <TableHead key={tc.id} className="font-black text-[10px] uppercase h-10 px-6 text-center">{tc.nome}</TableHead>
                                                ))}
                                                <TableHead className="font-black text-[10px] uppercase h-10 px-6 text-right">Acumulado</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {spacepoints.map((sp) => (
                                                <TableRow key={sp.id} className={cn("px-6", sp.numeroSpace === spacepoints.length ? "bg-primary/5" : "")}>
                                                    <TableCell className="px-6 font-black text-xs">#{sp.numeroSpace}</TableCell>
                                                    <TableCell className="px-6 text-xs font-bold text-muted-foreground">{sp.date ? format(sp.date, 'dd/MM/yyyy') : 'DATA NÃO DEFINIDA'}</TableCell>
                                                    {tiposCurso.map(tc => (
                                                        <TableCell key={tc.id} className="px-4">
                                                            <Input
                                                                type="number"
                                                                className="text-center font-bold h-9 bg-background border-none shadow-inner"
                                                                value={sp.metasPorTipo[tc.id] || '0'}
                                                                onChange={(e) => handleChange(sp.id, tc.id, e.target.value)}
                                                            />
                                                        </TableCell>
                                                    ))}
                                                    <TableCell className="px-6 text-right">
                                                        <div className="bg-primary/10 px-3 py-1 rounded text-primary font-black text-sm">
                                                            {getTotal(sp)}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                                <div className="p-6 bg-muted/10 border-t flex justify-end">
                                    <Button
                                        onClick={handleSave}
                                        disabled={isSaving || spacepoints.length === 0}
                                        className="bg-green-600 hover:bg-green-700 font-black uppercase tracking-wider px-12 py-6 rounded-xl shadow-lg hover:translate-y-[-2px] transition-all"
                                    >
                                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        <Save className="mr-2 h-4 w-4" />
                                        Salvar Metas do Polo
                                    </Button>
                                </div>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}


export default function SpacepointsManager({ processosSeletivos, allSpacepoints, allDates, tiposCurso, polos }: { processosSeletivos: ProcessoSeletivo[], allSpacepoints: DbSpacepoint[], allDates: Date[], tiposCurso: TipoCurso[], polos: string[] }) {
    const [view, setView] = useState<'list' | 'editor'>('list');
    const [editingProcesso, setEditingProcesso] = useState<string | null>(null);
    const [editingPolo, setEditingPolo] = useState<string | undefined>(undefined);
    const router = useRouter();

    const processoIds = processosSeletivos.map(p => p.id);

    const handleEdit = (processoId: string, polo?: string) => {
        setEditingProcesso(processoId);
        setEditingPolo(polo);
        setView('editor');
    }

    const handleNew = () => {
        setEditingProcesso(null);
        setEditingPolo(undefined);
        setView('editor');
    }

    if (view === 'editor') {
        return <SpacepointsEditor
            initialProcesso={editingProcesso}
            initialPolo={editingPolo}
            onBack={() => setView('list')}
            onSaveSuccess={() => { setView('list'); router.refresh(); }}
            allProcessos={processoIds}
            processoObjects={processosSeletivos}
            allSpacepoints={allSpacepoints}
            tiposCurso={tiposCurso}
            polos={polos}
        />
    }

    const formatDate = (date: Date) => format(date, 'dd/MM/yyyy');

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Cronograma de Semanas (Spacepoints)</CardTitle>
                    <Button onClick={handleNew}>
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Cronograma
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2 mb-4">
                    <Input placeholder="Buscar por número/ano..." className="max-w-xs" />
                    <Button variant="outline">Filtrar</Button>
                </div>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>PROCESSO SELETIVO</TableHead>
                                <TableHead className="text-center">QTD. SPACEPOINTS</TableHead>
                                <TableHead className="text-center">META TOTAL REDE</TableHead>
                                <TableHead className="text-right w-[100px]">AÇÕES</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {processosSeletivos.map(proc => {
                                const pId = proc.id;
                                const sps = allSpacepoints.filter(sp => sp.processoSeletivo === pId);
                                if (sps.length === 0) return (
                                    <TableRow key={pId}>
                                        <TableCell className="font-medium">{proc.numero}/{proc.ano}</TableCell>
                                        <TableCell className="text-center">0</TableCell>
                                        <TableCell className="text-center">-</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => handleEdit(pId)}>
                                                Configurar
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );

                                // Calculate network-wide total meta (sum of all polos for the latest space)
                                const latestSpaceNum = Math.max(...sps.map(s => s.numeroSpace));
                                // IMPORTANT: Only sum records that have a polo (ignore old global records)
                                const latestSpacepoints = sps.filter(s => s.numeroSpace === latestSpaceNum && !!s.polo);
                                const networkTotalMeta = latestSpacepoints.reduce((acc, curr) => acc + (curr.metaTotal || 0), 0);
                                const numSpaces = Array.from(new Set(sps.map(s => s.numeroSpace))).length;

                                return (
                                    <TableRow key={pId}>
                                        <TableCell className="font-medium">
                                            {proc.numero}/{proc.ano}
                                        </TableCell>
                                        <TableCell className="text-center">{numSpaces}</TableCell>
                                        <TableCell className="text-center font-bold text-primary">{networkTotalMeta}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => handleEdit(pId)}>
                                                Gerenciar
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

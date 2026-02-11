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
import { Loader2, PlusCircle, ArrowLeft, Trash2, Plus, Save } from 'lucide-react';
import { saveSpacepointsAction } from '@/actions/cadastros';
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
    const [spacepoints, setSpacepoints] = useState<EditorSpacepoint[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, startSavingTransition] = useTransition();
    const [areSpacepointsLoaded, setAreSpacepointsLoaded] = useState(false);

    // Shared dates across all polos for this process
    const [sharedDates, setSharedDates] = useState<Record<number, Date | undefined>>({});

    const handleLoadSpacepoints = useCallback(() => {
        if (!selectedProcesso) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Por favor, selecione um processo seletivo.' });
            return;
        }
        setIsLoading(true);
        setAreSpacepointsLoaded(false);

        setTimeout(() => {
            // Load ALL spacepoints for this process to find the established dates
            const allForProcess = allSpacepoints.filter(sp => sp.processoSeletivo === selectedProcesso);

            // Map space numbers to their dates (preferring the ones that have been set)
            const dateMap: Record<number, Date | undefined> = {};
            allForProcess.forEach(sp => {
                if (sp.dataSpace && (!dateMap[sp.numeroSpace] || sp.polo === undefined)) {
                    dateMap[sp.numeroSpace] = new Date(sp.dataSpace);
                }
            });
            setSharedDates(dateMap);

            // Now load specific metas for the selected polo
            const dataForPolo = allForProcess
                .filter(sp => (selectedPolo === 'GLOBAL' ? !sp.polo : sp.polo === selectedPolo))
                .sort((a, b) => a.numeroSpace - b.numeroSpace);

            // We want to show rows for ALL space numbers found in the process, not just the ones this polo has
            const spaceNumbers = Array.from(new Set(allForProcess.map(sp => sp.numeroSpace))).sort((a, b) => a - b);
            if (spaceNumbers.length === 0) spaceNumbers.push(1, 2, 3); // Default spaces for new

            const editorData = spaceNumbers.map(num => {
                const sp = dataForPolo.find(s => s.numeroSpace === num);
                const dynamicMetas: Record<string, string> = {};
                tiposCurso.forEach(tc => {
                    const key = tc.nome.toUpperCase();
                    dynamicMetas[tc.id] = String(sp?.metasPorTipo?.[key] || 0);
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
            setAreSpacepointsLoaded(true);
        }, 500);
    }, [selectedProcesso, selectedPolo, toast, allSpacepoints, tiposCurso]);

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
        toast({ title: 'Sucesso!', description: `${newSpacepoints.length} semanas geradas (7 em 7 dias).` });
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
        toast({ title: 'Lista limpa', description: 'Todas as semanas foram removidas.' });
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
        toast({ title: 'Semanas renumeradas', description: 'A ordem foi ajustada cronologicamente.' });
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
            const poloToSave = selectedPolo === 'GLOBAL' ? undefined : selectedPolo;
            const result = await saveSpacepointsAction(selectedProcesso, spacepointsToSave, poloToSave);
            if (result.success) {
                toast({ title: 'Sucesso!', description: `Metas do polo ${selectedPolo} salvos com sucesso.` });
                // We don't automatically go back to allow editing other polos
                setAreSpacepointsLoaded(false);
                handleLoadSpacepoints();
            } else {
                toast({ variant: 'destructive', title: 'Erro!', description: result.message });
            }
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-semibold text-foreground">{initialProcesso ? `Editando Spacepoints: ${initialProcesso}` : 'Novos Spacepoints'}</h1>
                <Button variant="secondary" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />Voltar para Lista</Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Gerenciar Spacepoints</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4 max-w-sm">
                        <div className="space-y-2 text-left">
                            <Label htmlFor="processo-seletivo">Processo Seletivo</Label>
                            <Select value={selectedProcesso} onValueChange={setSelectedProcesso} disabled={!!initialProcesso}>
                                <SelectTrigger id="processo-seletivo">
                                    <SelectValue placeholder="Selecione um processo seletivo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allProcessos.map(pId => <SelectItem key={pId} value={pId}>{processoObjects.find(p => p.id === pId)?.numero}/{processoObjects.find(p => p.id === pId)?.ano}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 text-left">
                            <Label htmlFor="polo-select">Polo</Label>
                            <Select
                                value={selectedPolo}
                                onValueChange={(val) => {
                                    setSelectedPolo(val);
                                    setAreSpacepointsLoaded(false);
                                }}
                            >
                                <SelectTrigger id="polo-select">
                                    <SelectValue placeholder="Selecione um polo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {polos.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="pt-2">
                            <Button
                                onClick={handleLoadSpacepoints}
                                disabled={isLoading || !selectedProcesso}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Carregar Spacepoints
                            </Button>
                        </div>
                    </div>

                    {areSpacepointsLoaded && (
                        <div className="space-y-6 pt-6 border-t">
                            <div className="flex justify-between items-center">
                                <CardDescription>
                                    Defina as datas e as metas para cada produto no processo seletivo <span className="font-semibold">{processoObjects.find(p => p.id === selectedProcesso)?.numero}/{processoObjects.find(p => p.id === selectedProcesso)?.ano}</span>.
                                </CardDescription>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-red-200 text-red-700 hover:bg-red-50"
                                        onClick={handleClearAll}
                                    >
                                        Limpar Tudo
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-blue-200 text-blue-700 hover:bg-blue-50"
                                        onClick={handleRenumberByDate}
                                    >
                                        Renumerar por Data
                                    </Button>
                                </div>
                            </div>

                            <div className="border rounded-lg overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[80px]">SEMANA</TableHead>
                                            <TableHead className="w-[180px]">DATA</TableHead>
                                            {tiposCurso.map(tc => (
                                                <TableHead key={tc.id} className="text-center min-w-[80px]">{tc.nome.toUpperCase()}</TableHead>
                                            ))}
                                            <TableHead className="text-center font-bold">TOTAL</TableHead>
                                            <TableHead className="text-right w-[100px]">AÇÕES</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {spacepoints.map((sp, index) => (
                                            <TableRow key={sp.id}>
                                                <TableCell className="font-medium">#{sp.numeroSpace}</TableCell>
                                                <TableCell>
                                                    <DatePicker value={sp.date} onValueChange={(date) => handleDateChange(sp.id, date)} />
                                                </TableCell>
                                                {tiposCurso.map(tc => (
                                                    <TableCell key={tc.id}>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            className="text-center h-8"
                                                            value={sp.metasPorTipo[tc.id] || '0'}
                                                            onChange={(e) => handleChange(sp.id, tc.id, e.target.value)}
                                                        />
                                                    </TableCell>
                                                ))}
                                                <TableCell className="text-center font-bold">
                                                    {getTotal(sp)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleRemoveRow(sp.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex items-center justify-between pt-6 border-t">
                                <div>
                                    <Button variant="outline" onClick={handleAddRow}>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Adicionar Semana
                                    </Button>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Button onClick={handleSave} disabled={isSaving || spacepoints.length === 0} className="bg-green-600 hover:bg-green-700 text-white px-8">
                                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        <Save className="mr-2 h-4 w-4" />
                                        Salvar Spacepoints
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div >
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
                                <TableHead className="text-center">QTD. SEMANAS</TableHead>
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
                                const latestSpacepoints = sps.filter(s => s.numeroSpace === latestSpaceNum);
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

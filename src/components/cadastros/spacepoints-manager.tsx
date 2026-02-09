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
import type { Spacepoint as DbSpacepoint, TipoCurso } from '@/lib/types';
import { format } from 'date-fns';

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
    processoLabels,
    allSpacepoints,
    tiposCurso,
    polos,
}: {
    initialProcesso: string | null;
    initialPolo?: string;
    onBack: () => void;
    onSaveSuccess: () => void;
    allProcessos: string[];
    processoLabels?: Map<string, string>;
    allSpacepoints: DbSpacepoint[];
    tiposCurso: TipoCurso[];
    polos: string[];
}) {
    const { toast } = useToast();
    const [selectedProcesso, setSelectedProcesso] = useState<string>(initialProcesso || '');
    const [selectedPolo, setSelectedPolo] = useState<string>(initialPolo || 'GLOBAL');
    const [spacepoints, setSpacepoints] = useState<EditorSpacepoint[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, startSavingTransition] = useTransition();
    const [areSpacepointsLoaded, setAreSpacepointsLoaded] = useState(false);

    const handleLoadSpacepoints = useCallback(() => {
        if (!selectedProcesso) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Por favor, selecione um processo seletivo.' });
            return;
        }
        setIsLoading(true);
        setAreSpacepointsLoaded(false);
        setTimeout(() => {
            const dataForProcesso = allSpacepoints
                .filter(sp =>
                    sp.processoSeletivo === selectedProcesso &&
                    (selectedPolo === 'GLOBAL' ? !sp.polo : sp.polo === selectedPolo)
                )
                .sort((a, b) => a.numeroSpace - b.numeroSpace)
                .map(sp => {
                    const dynamicMetas: Record<string, string> = {};
                    tiposCurso.forEach(tc => {
                        // Mapping logic: check if metasPorTipo has key by ID or Name
                        // If we saved by Name previously (migration), we might need to map.
                        // But for new logic, let's try to use ID as key if possible, OR Name.
                        // The type definition says Key: Uppercase Name. 
                        const key = tc.nome.toUpperCase();
                        dynamicMetas[tc.id] = String(sp.metasPorTipo?.[key] || 0);
                    });

                    return {
                        id: sp.id,
                        numeroSpace: sp.numeroSpace,
                        date: new Date(sp.dataSpace),
                        metaTotal: sp.metaTotal,
                        metasPorTipo: dynamicMetas
                    };
                });

            setSpacepoints(dataForProcesso);
            setIsLoading(false);
            setAreSpacepointsLoaded(true);
        }, 500); // Simulate network delay
    }, [selectedProcesso, toast, allSpacepoints, tiposCurso]);

    useEffect(() => {
        if (selectedProcesso) {
            handleLoadSpacepoints();
        }
    }, [selectedProcesso, selectedPolo, handleLoadSpacepoints]);


    const handleAddRow = () => {
        const nextNum = spacepoints.length > 0 ? Math.max(...spacepoints.map(s => s.numeroSpace)) + 1 : 1;

        const initialMetas: Record<string, string> = {};
        tiposCurso.forEach(tc => initialMetas[tc.id] = '0');

        setSpacepoints([...spacepoints, {
            id: `temp_${Date.now()}`,
            numeroSpace: nextNum,
            date: undefined,
            metaTotal: 0,
            metasPorTipo: initialMetas
        }]);
    };

    const handleRemoveRow = (id: string) => {
        setSpacepoints(spacepoints.filter(sp => sp.id !== id));
    };

    const handleDateChange = (id: string, newDate: Date | undefined) => {
        setSpacepoints(spacepoints.map(sp => sp.id === id ? { ...sp, date: newDate } : sp));
    };

    const handleChange = (id: string, tipoId: string, value: string) => {
        setSpacepoints(spacepoints.map(sp => {
            if (sp.id !== id) return sp;
            return {
                ...sp,
                metasPorTipo: {
                    ...sp.metasPorTipo,
                    [tipoId]: value
                }
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
            .filter(sp => sp.date) // Must have date
            .map((sp, index) => {
                const total = getTotal(sp);

                // Convert UI ID-based keys to Backend Name-based keys (UPPERCASE)
                const metasToSave: Record<string, number> = {};
                tiposCurso.forEach(tc => {
                    metasToSave[tc.nome.toUpperCase()] = Number(sp.metasPorTipo[tc.id]) || 0;
                });

                return {
                    numeroSpace: sp.numeroSpace, // Or reset to index + 1 if we want to enforce sequential
                    dataSpace: sp.date!,
                    metaTotal: total,
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
                toast({ title: 'Sucesso!', description: `Spacepoints para ${processoLabels?.get(selectedProcesso) || selectedProcesso} salvos com sucesso.` });
                onSaveSuccess();
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
                        <div className="space-y-2">
                            <Label htmlFor="processo-seletivo">Processo Seletivo</Label>
                            <Select value={selectedProcesso} onValueChange={setSelectedProcesso} disabled={!!initialProcesso}>
                                <SelectTrigger id="processo-seletivo">
                                    <SelectValue placeholder="Selecione um processo seletivo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allProcessos.map(pId => <SelectItem key={pId} value={pId}>{processoLabels?.get(pId) || pId}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="polo-select">Polo</Label>
                            <Select
                                value={selectedPolo}
                                onValueChange={(val) => {
                                    setSelectedPolo(val);
                                    // The useEffect will handle the load
                                }}
                            >
                                <SelectTrigger id="polo-select">
                                    <SelectValue placeholder="Selecione um polo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="GLOBAL">GLOBAL (Média da Rede)</SelectItem>
                                    {polos.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {areSpacepointsLoaded && (
                        <div className="space-y-6 pt-6 border-t">
                            <CardDescription>
                                Defina as datas e as metas para cada produto no processo seletivo <span className="font-semibold">{processoLabels?.get(selectedProcesso)}</span>.
                            </CardDescription>

                            <div className="border rounded-lg overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[80px]">SPACE</TableHead>
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
                                        Adicionar Space
                                    </Button>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Button onClick={handleSave} disabled={isSaving || spacepoints.length === 0} className="bg-green-600 hover:bg-green-700 text-white">
                                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        <Save className="mr-2 h-4 w-4" />
                                        Salvar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}


export default function SpacepointsManager({ processosSeletivos, allSpacepoints, allDates, tiposCurso, polos }: { processosSeletivos: { id: string, numero: string, ano: number }[], allSpacepoints: DbSpacepoint[], allDates: Date[], tiposCurso: TipoCurso[], polos: string[] }) {
    const [view, setView] = useState<'list' | 'editor'>('list');
    const [editingProcesso, setEditingProcesso] = useState<string | null>(null);
    const [editingPolo, setEditingPolo] = useState<string | undefined>(undefined);
    const router = useRouter();

    // Create a map for display labels
    const processoLabels = new Map(processosSeletivos.map(p => [p.id, `${p.numero}/${p.ano}`]));
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
            processoLabels={processoLabels}
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
                    <CardTitle>Spacepoints por Processo Seletivo</CardTitle>
                    <Button onClick={handleNew}>
                        <Plus className="mr-2 h-4 w-4" />
                        Gerenciar Spacepoints
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
                                <TableHead className="text-center">QTD. SPACES</TableHead>
                                <TableHead className="text-center">META TOTAL</TableHead>
                                <TableHead className="text-right w-[100px]">AÇÕES</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {processoIds.flatMap(pId => {
                                // Get all unique combinations of (Processo, Polo) that have spacepoints
                                const combinations = [
                                    { pId, polo: undefined, label: 'GLOBAL' },
                                    ...polos.map(p => ({ pId, polo: p, label: p }))
                                ].filter(comb => {
                                    return allSpacepoints.some(sp => sp.processoSeletivo === comb.pId && (comb.polo === undefined ? !sp.polo : sp.polo === comb.polo));
                                });

                                // fallback if no spacepoints for this process yet, show at least a generic row if it matches search
                                if (combinations.length === 0) {
                                    return [(
                                        <TableRow key={pId}>
                                            <TableCell className="font-medium">{processoLabels.get(pId)}</TableCell>
                                            <TableCell className="text-center">0</TableCell>
                                            <TableCell className="text-center">-</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm" onClick={() => handleEdit(pId)}>
                                                    Configurar
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )];
                                }

                                return combinations.map(comb => {
                                    const sps = allSpacepoints.filter(sp =>
                                        sp.processoSeletivo === comb.pId &&
                                        (comb.polo === undefined ? !sp.polo : sp.polo === comb.polo)
                                    );
                                    const totalMeta = sps.length > 0 ? Math.max(...sps.map(s => s.metaTotal || 0)) : 0;

                                    return (
                                        <TableRow key={`${comb.pId}-${comb.polo || 'global'}`}>
                                            <TableCell className="font-medium">
                                                {processoLabels.get(comb.pId)}
                                                <span className="ml-2 text-xs font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                                                    {comb.label}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">{sps.length}</TableCell>
                                            <TableCell className="text-center">{totalMeta}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm" onClick={() => handleEdit(comb.pId, comb.polo)}>
                                                    Editar
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                });
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

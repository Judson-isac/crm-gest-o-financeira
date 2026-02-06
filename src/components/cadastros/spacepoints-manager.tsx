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
import type { Spacepoint as DbSpacepoint } from '@/lib/types';
import { format } from 'date-fns';

type EditorSpacepoint = {
    id: string; // Use string for temp IDs too
    date: Date | undefined;
    percentage: string;
};

function SpacepointsEditor({
    initialProcesso,
    onBack,
    onSaveSuccess,
    allProcessos,
    processoLabels,
    allSpacepoints,
}: {
    initialProcesso: string | null;
    onBack: () => void;
    onSaveSuccess: () => void;
    allProcessos: string[];
    processoLabels?: Map<string, string>;
    allSpacepoints: DbSpacepoint[];
}) {
    const { toast } = useToast();
    const [selectedProcesso, setSelectedProcesso] = useState<string>(initialProcesso || '');
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
                .filter(sp => sp.processoSeletivo === selectedProcesso)
                .map(sp => ({
                    id: sp.id,
                    date: new Date(sp.date),
                    percentage: String(sp.percentage)
                }));
            setSpacepoints(dataForProcesso);
            setIsLoading(false);
            setAreSpacepointsLoaded(true);
        }, 500); // Simulate network delay
    }, [selectedProcesso, toast, allSpacepoints]);

    useEffect(() => {
        if (initialProcesso) {
            handleLoadSpacepoints();
        }
    }, [initialProcesso, handleLoadSpacepoints]);


    const handleAddRow = () => {
        setSpacepoints([...spacepoints, { id: `temp_${Date.now()}`, date: undefined, percentage: '' }]);
    };

    const handleRemoveRow = (id: string) => {
        setSpacepoints(spacepoints.filter(sp => sp.id !== id));
    };

    const handleDateChange = (id: string, newDate: Date | undefined) => {
        setSpacepoints(spacepoints.map(sp => sp.id === id ? { ...sp, date: newDate } : sp));
    };

    const handlePercentageChange = (id: string, newPercentage: string) => {
        setSpacepoints(spacepoints.map(sp => sp.id === id ? { ...sp, percentage: newPercentage } : sp));
    };

    const handleSave = () => {
        const spacepointsToSave = spacepoints
            .filter(sp => sp.date && sp.percentage)
            .map(sp => ({
                date: sp.date!,
                percentage: Number(sp.percentage),
            }));

        startSavingTransition(async () => {
            const result = await saveSpacepointsAction(selectedProcesso, spacepointsToSave);
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
                        <Button onClick={handleLoadSpacepoints} disabled={isLoading || !selectedProcesso}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Carregar Spacepoints
                        </Button>
                    </div>

                    {areSpacepointsLoaded && (
                        <div className="space-y-6 pt-6 border-t">
                            <CardDescription>
                                Defina as datas e os percentuais acumulados para o processo seletivo <span className="font-semibold">{processoLabels.get(selectedProcesso)}</span>.
                            </CardDescription>

                            <div className="grid grid-cols-[1fr_1fr_auto] gap-4 items-center font-medium text-sm text-muted-foreground px-2">
                                <span>DATA</span>
                                <span>PERCENTUAL ACUMULADO (%)</span>
                                <span className="w-28 text-center">AÇÕES</span>
                            </div>
                            {spacepoints.map(sp => (
                                <div key={sp.id} className="grid grid-cols-[1fr_1fr_auto] gap-4 items-center">
                                    <DatePicker value={sp.date} onValueChange={(date) => handleDateChange(sp.id, date)} />
                                    <Input type="number" value={sp.percentage} onChange={(e) => handlePercentageChange(sp.id, e.target.value)} />
                                    <Button variant="destructive-outline" className="w-28" onClick={() => handleRemoveRow(sp.id)}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Excluir
                                    </Button>
                                </div>
                            ))}
                            <div className="flex items-center justify-between pt-6 border-t">
                                <div>
                                    <Button variant="outline" onClick={handleAddRow}>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Adicionar linha
                                    </Button>
                                </div>
                                <div className="flex items-center gap-4">
                                    <p className="text-xs text-muted-foreground max-w-xs">
                                        Os percentuais devem ser acumulados (ex.: 20 → 50 → 80 → 100), crescentes e dentro do período do Processo Seletivo.
                                    </p>
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


export function SpacepointsManager({ processosSeletivos, allSpacepoints, allDates }: { processosSeletivos: { id: string, numero: string, ano: number }[], allSpacepoints: DbSpacepoint[], allDates: Date[] }) {
    const [view, setView] = useState<'list' | 'editor'>('list');
    const [editingProcesso, setEditingProcesso] = useState<string | null>(null);
    const router = useRouter();

    // Create a map for display labels
    const processoLabels = new Map(processosSeletivos.map(p => [p.id, `${p.numero}/${p.ano}`]));
    const processoIds = processosSeletivos.map(p => p.id);

    const handleEdit = (processoId: string) => {
        setEditingProcesso(processoId);
        setView('editor');
    }

    const handleNew = () => {
        setEditingProcesso(null);
        setView('editor');
    }

    if (view === 'editor') {
        return <SpacepointsEditor
            initialProcesso={editingProcesso}
            onBack={() => setView('list')}
            onSaveSuccess={() => { setView('list'); router.refresh(); }}
            allProcessos={processoIds}
            processoLabels={processoLabels}
            allSpacepoints={allSpacepoints}
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
                                <TableHead className="w-[150px]">PROCESSO SELETIVO</TableHead>
                                {allDates.map(date => (
                                    <TableHead key={date.getTime()} className="text-center">{formatDate(date)}</TableHead>
                                ))}
                                <TableHead className="text-right w-[100px]">AÇÕES</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {processoIds.map(pId => {
                                const spacepointsForProcesso = new Map(
                                    allSpacepoints
                                        .filter(sp => sp.processoSeletivo === pId && sp.date)
                                        .map(sp => [formatDate(new Date(sp.date)), sp.percentage])
                                );
                                return (
                                    <TableRow key={pId}>
                                        <TableCell className="font-medium">{processoLabels.get(pId)}</TableCell>
                                        {allDates.map(date => (
                                            <TableCell key={date.getTime()} className="text-center">
                                                {spacepointsForProcesso.get(formatDate(date)) ? `${spacepointsForProcesso.get(formatDate(date))}%` : '–'}
                                            </TableCell>
                                        ))}
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => handleEdit(pId)}>
                                                Editar
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

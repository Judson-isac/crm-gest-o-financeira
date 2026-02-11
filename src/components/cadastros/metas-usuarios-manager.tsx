'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Save, ArrowLeft, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Usuario, ProcessoSeletivo, Spacepoint, MetaUsuario } from '@/lib/types';
import { saveMetasUsuariosAction, getMetasUsuariosAction } from '@/actions/cadastros';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type MetasUsuariosManagerProps = {
    usuarios: Usuario[];
    processosSeletivos: ProcessoSeletivo[];
    allSpacepoints: Spacepoint[];
};

export function MetasUsuariosManager({ usuarios, processosSeletivos, allSpacepoints }: MetasUsuariosManagerProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [selectedUsuario, setSelectedUsuario] = useState<string>('');
    const [selectedProcesso, setSelectedProcesso] = useState<string>('');
    const [weeklyMetas, setWeeklyMetas] = useState<Record<number, number>>({});
    const [isLoadingMetas, setIsLoadingMetas] = useState(false);

    const availableSpaces = useMemo(() => {
        if (!selectedProcesso) return [];
        // Filter spacepoints for this process. We only need unique week numbers and their dates.
        const processSpaces = allSpacepoints.filter(sp => sp.processoSeletivo === selectedProcesso);

        // Group by week number to get the date (preferring GLOBAL or first found)
        const weeksMap = new Map<number, Date>();
        processSpaces.sort((a, b) => a.numeroSpace - b.numeroSpace).forEach(sp => {
            if (!weeksMap.has(sp.numeroSpace) || !sp.polo) {
                weeksMap.set(sp.numeroSpace, new Date(sp.dataSpace));
            }
        });

        return Array.from(weeksMap.entries()).map(([num, date]) => ({
            numero: num,
            data: date
        }));
    }, [selectedProcesso, allSpacepoints]);

    useEffect(() => {
        if (selectedUsuario && selectedProcesso) {
            loadMetas();
        } else {
            setWeeklyMetas({});
        }
    }, [selectedUsuario, selectedProcesso]);

    const loadMetas = async () => {
        setIsLoadingMetas(true);
        const result = await getMetasUsuariosAction(selectedProcesso, selectedUsuario);
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
        if (!selectedUsuario || !selectedProcesso) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Selecione um usuário e um processo seletivo.' });
            return;
        }

        const metasToSave = Object.entries(weeklyMetas).map(([semana, qtd]) => ({
            numeroSemana: parseInt(semana),
            metaQtd: qtd
        }));

        startTransition(async () => {
            const result = await saveMetasUsuariosAction(selectedUsuario, selectedProcesso, metasToSave);
            if (result.success) {
                toast({ title: 'Metas salvas com sucesso!' });
                router.refresh();
            } else {
                toast({ variant: 'destructive', title: 'Erro ao salvar', description: result.message });
            }
        });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Metas Individuais por Vaga/Semana</CardTitle>
                    <CardDescription>Defina as metas de matrículas para cada vendedor por semana do processo seletivo.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="space-y-2">
                            <Label htmlFor="usuario">Usuário / Vendedor</Label>
                            <Select value={selectedUsuario} onValueChange={setSelectedUsuario}>
                                <SelectTrigger id="usuario">
                                    <SelectValue placeholder="Selecione um vendedor..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {usuarios.map(u => (
                                        <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="processo">Processo Seletivo</Label>
                            <Select value={selectedProcesso} onValueChange={setSelectedProcesso}>
                                <SelectTrigger id="processo">
                                    <SelectValue placeholder="Selecione um processo seletivo..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {processosSeletivos.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.numero}/{p.ano}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {!selectedUsuario || !selectedProcesso ? (
                        <div className="flex flex-col h-48 items-center justify-center rounded-md border-2 border-dashed text-center">
                            <Search className="h-12 w-12 text-muted-foreground" />
                            <p className="text-muted-foreground mt-4">Selecione um usuário e um processo para começar a definir as metas.</p>
                        </div>
                    ) : isLoadingMetas ? (
                        <div className="flex h-48 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="w-[150px]">VAGA / SEMANA</TableHead>
                                            <TableHead className="w-[250px]">DATA DE REFERÊNCIA</TableHead>
                                            <TableHead className="text-center">META (QTD. MATRÍCULAS)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {availableSpaces.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3} className="h-24 text-center">
                                                    Nenhum Spacepoint (vaga) configurado para este processo seletivo.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            availableSpaces.map((week) => (
                                                <TableRow key={week.numero}>
                                                    <TableCell className="font-semibold">Vaga {week.numero}</TableCell>
                                                    <TableCell>
                                                        {format(week.data, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                                    </TableCell>
                                                    <TableCell className="flex justify-center">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            className="w-32 text-center"
                                                            value={weeklyMetas[week.numero] ?? 0}
                                                            onChange={(e) => handleMetaChange(week.numero, e.target.value)}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex justify-end gap-4">
                                <Button
                                    onClick={handleSave}
                                    disabled={isPending || availableSpaces.length === 0}
                                    className="bg-green-600 hover:bg-green-700 text-white px-8"
                                >
                                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Salvar Metas
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

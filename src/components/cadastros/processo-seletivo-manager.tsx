'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Save, ArrowLeft, Plus, Search, Power, Pencil, Trash2, Loader2 } from 'lucide-react';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { ProcessoSeletivo, NumeroProcessoSeletivo } from '@/lib/types';
import { saveProcessoSeletivoAction, deleteProcessoSeletivoAction } from '@/actions/cadastros';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ManagerProps = {
    initialProcessos: ProcessoSeletivo[];
    numerosProcessoSeletivo: NumeroProcessoSeletivo[];
}

export function ProcessoSeletivoManager({ initialProcessos, numerosProcessoSeletivo }: ManagerProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [view, setView] = useState<'list' | 'form'>('list');
    const [editingProcesso, setEditingProcesso] = useState<Partial<ProcessoSeletivo> | null>(null);
    const [activeTab, setActiveTab] = useState('ativos');
    
    const [processos, setProcessos] = useState(initialProcessos);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [processoToDelete, setProcessoToDelete] = useState<ProcessoSeletivo | null>(null);

    // Form state
    const [numero, setNumero] = useState('');
    const [ano, setAno] = useState<number | ''>(new Date().getFullYear());
    const [dataInicial, setDataInicial] = useState<Date | undefined>();
    const [dataFinal, setDataFinal] = useState<Date | undefined>();
    const [ativo, setAtivo] = useState(true);

    useEffect(() => {
        setProcessos(initialProcessos);
    }, [initialProcessos]);

    const openForm = (processo: ProcessoSeletivo | null = null) => {
        setEditingProcesso(processo);
        if (processo) {
            setNumero(processo.numero);
            setAno(processo.ano);
            setDataInicial(processo.dataInicial ? new Date(processo.dataInicial) : undefined);
            setDataFinal(processo.dataFinal ? new Date(processo.dataFinal) : undefined);
            setAtivo(processo.ativo);
        } else {
            setNumero('');
            setAno(new Date().getFullYear());
            setDataInicial(undefined);
            setDataFinal(undefined);
            setAtivo(true);
        }
        setView('form');
    };

    const closeForm = () => {
        setEditingProcesso(null);
        setView('list');
    };

    const handleSave = () => {
        if (!numero || !ano || !dataInicial || !dataFinal) {
            toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Preencha todos os campos marcados com *.' });
            return;
        }
        startTransition(async () => {
            const result = await saveProcessoSeletivoAction({
                id: editingProcesso?.id,
                numero,
                ano: Number(ano),
                dataInicial,
                dataFinal,
                ativo,
            });
            if (result.success) {
                toast({ title: editingProcesso ? 'Processo atualizado!' : 'Processo criado!' });
                closeForm();
                router.refresh();
            } else {
                toast({ variant: 'destructive', title: 'Erro!', description: result.message });
            }
        });
    };

    const handleToggleStatus = (processo: ProcessoSeletivo) => {
        startTransition(async () => {
            const result = await saveProcessoSeletivoAction({ ...processo, ativo: !processo.ativo });
            if(result.success) {
                toast({ title: 'Status alterado!' });
                router.refresh();
            } else {
                toast({ variant: 'destructive', title: 'Erro!', description: result.message });
            }
        });
    };

    const handleDelete = (processo: ProcessoSeletivo) => {
        setProcessoToDelete(processo);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = () => {
        if (processoToDelete) {
            startTransition(async () => {
                const result = await deleteProcessoSeletivoAction(processoToDelete.id);
                if (result.success) {
                    toast({ title: `Processo ${processoToDelete.numero}/${processoToDelete.ano} removido.` });
                    router.refresh();
                } else {
                    toast({ variant: 'destructive', title: 'Erro!', description: result.message });
                }
                setDeleteConfirmOpen(false);
                setProcessoToDelete(null);
            });
        }
    };

    const processosFiltrados = processos.filter(p => activeTab === 'ativos' ? p.ativo : !p.ativo);

    if (view === 'form') {
        return (
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-xl font-semibold text-foreground">{editingProcesso ? 'Editar Processo Seletivo' : 'Novo Processo Seletivo'}</h1>
                     <Button variant="secondary" onClick={closeForm}><ArrowLeft className="mr-2 h-4 w-4"/>Voltar</Button>
                </div>
                <Card>
                    <CardContent className="p-6">
                        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="numero">Numero *</Label>
                                    <Select value={numero} onValueChange={setNumero} required>
                                        <SelectTrigger id="numero"><SelectValue placeholder="Selecione..."/></SelectTrigger>
                                        <SelectContent>
                                            {numerosProcessoSeletivo.map(n => <SelectItem key={n.id} value={n.numero}>{n.numero}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="ano">Ano *</Label>
                                    <Input id="ano" type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="data-inicial">Data inicial *</Label>
                                    <DatePicker value={dataInicial} onValueChange={setDataInicial} />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="data-final">Data final *</Label>
                                    <DatePicker value={dataFinal} onValueChange={setDataFinal} />
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="ativo" checked={ativo} onCheckedChange={(checked) => setAtivo(checked as boolean)} />
                                <Label htmlFor="ativo">Ativo</Label>
                            </div>
                            <div className="flex items-center gap-2 pt-4">
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                                    Salvar
                                </Button>
                                <Button type="button" variant="secondary" onClick={closeForm}>
                                    Cancelar
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Processos Seletivos</CardTitle>
                        <Button onClick={() => openForm()}>
                            <Plus className="mr-2 h-4 w-4" />
                            Novo
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg p-4 space-y-4 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div className="space-y-2 md:col-span-1">
                                <Label htmlFor="busca">Busca</Label>
                                <Input id="busca" placeholder="Numero Ano Data Inicial Data Final" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ordenar-por">Ordenar por</Label>
                                <Select defaultValue="ano-za">
                                    <SelectTrigger id="ordenar-por">
                                        <SelectValue placeholder="Ordenar por" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ano-za">Ano (Z-A)</SelectItem>
                                        <SelectItem value="ano-az">Ano (A-Z)</SelectItem>
                                        <SelectItem value="numero-za">Número (Z-A)</SelectItem>
                                        <SelectItem value="numero-az">Número (A-Z)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex gap-2 items-end">
                                <Button variant="secondary">
                                    <Search className="mr-2 h-4 w-4" />
                                    Filtrar
                                </Button>
                                <Button variant="destructive-outline">
                                    Limpar
                                </Button>
                            </div>
                        </div>
                    </div>
                    
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList>
                            <TabsTrigger value="ativos">Ativos</TabsTrigger>
                            <TabsTrigger value="encerrados">Encerrados</TabsTrigger>
                        </TabsList>
                        <TabsContent value={activeTab}>
                            <div className="border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>NÚMERO</TableHead>
                                            <TableHead>ANO</TableHead>
                                            <TableHead>DATA INICIAL</TableHead>
                                            <TableHead>DATA FINAL</TableHead>
                                            <TableHead>ATIVO</TableHead>
                                            <TableHead className="text-right">AÇÕES</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {processosFiltrados.map(processo => (
                                            <TableRow key={processo.id}>
                                                <TableCell className="font-medium text-primary">{processo.numero}</TableCell>
                                                <TableCell>{processo.ano}</TableCell>
                                                <TableCell>{format(new Date(processo.dataInicial), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                                                <TableCell>{format(new Date(processo.dataFinal), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                                                <TableCell>
                                                    <Badge variant={processo.ativo ? 'secondary' : 'destructive'} className={processo.ativo ? "bg-green-100 text-green-800" : ""}>
                                                        {processo.ativo ? 'Ativo' : 'Encerrado'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleToggleStatus(processo)} disabled={isPending}>
                                                        <Power className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-yellow-600" onClick={() => openForm(processo)} disabled={isPending}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(processo)} disabled={isPending}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {processosFiltrados.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center">Nenhum processo seletivo encontrado.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                           Esta ação não pode ser desfeita. O processo seletivo será removido permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

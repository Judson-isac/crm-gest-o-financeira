
'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Save, ArrowLeft, Plus, Trash2, Pencil, Search, Loader2 } from 'lucide-react';
import type { NumeroProcessoSeletivo } from '@/lib/types';
import { saveNumeroProcessoSeletivoAction, deleteNumeroProcessoSeletivoAction } from '@/actions/cadastros';
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
    initialNumeros: NumeroProcessoSeletivo[];
    redes: { id: string; nome: string }[];
}

export function NumeroProcessoSeletivoManager({ initialNumeros, redes }: ManagerProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [numeros, setNumeros] = useState(initialNumeros);
    const [view, setView] = useState<'list' | 'form'>('list');
    const [editingNumero, setEditingNumero] = useState<Partial<NumeroProcessoSeletivo> | null>(null);

    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [numeroToDelete, setNumeroToDelete] = useState<NumeroProcessoSeletivo | null>(null);

    // Form state
    const [numeroForm, setNumeroForm] = useState('');
    const [redeIdForm, setRedeIdForm] = useState('');

    useEffect(() => {
        setNumeros(initialNumeros);
    }, [initialNumeros]);

    const openForm = (numero: NumeroProcessoSeletivo | null = null) => {
        setEditingNumero(numero);
        if (numero) {
            setNumeroForm(numero.numero);
            setRedeIdForm(numero.redeId);
        } else {
            setNumeroForm('');
            setRedeIdForm('');
        }
        setView('form');
    };

    const closeForm = () => {
        setEditingNumero(null);
        setView('list');
    };

    const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        startTransition(async () => {
            const result = await saveNumeroProcessoSeletivoAction({
                id: editingNumero?.id,
                numero: numeroForm,
                redeId: redeIdForm,
            });
            if (result.success) {
                toast({ title: editingNumero ? 'Número atualizado!' : 'Número salvo!' });
                closeForm();
                router.refresh();
            } else {
                toast({ variant: 'destructive', title: 'Erro!', description: result.message });
            }
        });
    };

    const handleDelete = (numero: NumeroProcessoSeletivo) => {
        setNumeroToDelete(numero);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = () => {
        if (numeroToDelete) {
            startTransition(async () => {
                const result = await deleteNumeroProcessoSeletivoAction(numeroToDelete.id);
                if (result.success) {
                    toast({ title: `Número "${numeroToDelete.numero}" removido.` });
                    router.refresh();
                } else {
                    toast({ variant: 'destructive', title: 'Erro!', description: result.message });
                }
                setDeleteConfirmOpen(false);
                setNumeroToDelete(null);
            });
        }
    };

    if (view === 'form') {
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-xl font-semibold text-foreground">{editingNumero ? 'Editar Número do Processo Seletivo' : 'Novo Número do Processo Seletivo'}</h1>
                    <Button variant="secondary" onClick={closeForm}><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
                </div>
                <Card>
                    <CardContent className="p-6">
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="rede">Rede *</Label>
                                    <Select value={redeIdForm} onValueChange={setRedeIdForm} required>
                                        <SelectTrigger id="rede"><SelectValue placeholder="Selecione a rede" /></SelectTrigger>
                                        <SelectContent>
                                            {redes.map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="numero">Número *</Label>
                                    <Input id="numero" value={numeroForm} onChange={(e) => setNumeroForm(e.target.value)} required />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 pt-4">
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
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
                        <CardTitle>Número do Processo Seletivo</CardTitle>
                        <Button onClick={() => openForm()}>
                            <Plus className="mr-2 h-4 w-4" />
                            Novo
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg p-4 space-y-4 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div className="space-y-2">
                                <Label htmlFor="busca">Busca</Label>
                                <Input id="busca" placeholder="Número ou rede" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ordenar-por">Ordenar por</Label>
                                <Select defaultValue="numero-az">
                                    <SelectTrigger id="ordenar-por">
                                        <SelectValue placeholder="Ordenar por" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="numero-az">Número (A-Z)</SelectItem>
                                        <SelectItem value="numero-za">Número (Z-A)</SelectItem>
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

                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>NÚMERO</TableHead>
                                    <TableHead>REDE</TableHead>
                                    <TableHead className="text-right">AÇÕES</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {numeros.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.numero}</TableCell>
                                        <TableCell>{item.rede}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" className="text-yellow-500 hover:text-yellow-600" onClick={() => openForm(item)} disabled={isPending}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(item)} disabled={isPending}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {numeros.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24">Nenhum número cadastrado.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O número do processo seletivo será removido permanentemente.
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

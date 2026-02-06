'use client';

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { Save, ArrowLeft, Plus, Trash2, Pencil, Search, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Canal } from '@/lib/types';
import { saveCanalAction, deleteCanalAction } from '@/actions/cadastros';

export function CanaisManager({ initialCanais }: { initialCanais: Canal[] }) {
    const router = useRouter();
    const { toast } = useToast();
    const [canais, setCanais] = useState<Canal[]>(initialCanais);
    const [editingCanal, setEditingCanal] = useState<Canal | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [filter, setFilter] = useState('');
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [canalToDelete, setCanalToDelete] = useState<Canal | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        setCanais(initialCanais);
    }, [initialCanais]);

    const openForm = (canal: Canal | null = null) => {
        setEditingCanal(canal);
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setEditingCanal(null);
        setIsFormOpen(false);
    };

    const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const nome = formData.get('canal') as string;
        const ativo = formData.get('ativo') === 'on';

        startTransition(async () => {
            const result = await saveCanalAction({ id: editingCanal?.id, nome, ativo });
            if (result.success) {
                toast({ title: editingCanal ? 'Canal atualizado!' : 'Canal adicionado!' });
                closeForm();
                router.refresh(); 
            } else {
                toast({ variant: 'destructive', title: 'Erro!', description: result.message });
            }
        });
    };

    const handleDelete = (canal: Canal) => {
        setCanalToDelete(canal);
        setDeleteConfirmOpen(true);
    };
    
    const confirmDelete = () => {
        if(canalToDelete) {
             startTransition(async () => {
                const result = await deleteCanalAction(canalToDelete.id);
                if (result.success) {
                    toast({ title: `Canal "${canalToDelete.nome}" removido.` });
                    router.refresh();
                } else {
                    toast({ variant: 'destructive', title: 'Erro!', description: result.message });
                }
                setDeleteConfirmOpen(false);
                setCanalToDelete(null);
            });
        }
    }

    const filteredCanais = canais.filter(c => c.nome.toLowerCase().includes(filter.toLowerCase()));

    if (isFormOpen) {
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-xl font-semibold text-foreground">{editingCanal ? 'Editar Canal' : 'Novo Canal'}</h1>
                    <Button variant="secondary" onClick={closeForm}><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
                </div>
                <Card>
                    <CardContent className="p-6">
                        <form onSubmit={handleSave} className="space-y-6">
                             <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="canal">Canal *</Label>
                                    <Input id="canal" name="canal" defaultValue={editingCanal?.nome || ''} required />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="ativo" name="ativo" defaultChecked={editingCanal?.ativo ?? true} />
                                    <Label htmlFor="ativo">Ativo</Label>
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
                        <CardTitle>Canais de Marketing</CardTitle>
                        <Button onClick={() => openForm()}>
                            <Plus className="mr-2 h-4 w-4" />
                            Novo Canal
                        </Button>
                    </div>
                     <div className="mt-4">
                        <Input
                        placeholder="Buscar por nome..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="max-w-sm"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                     <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>NOME</TableHead>
                                    <TableHead>STATUS</TableHead>
                                    <TableHead className="text-right">AÇÕES</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCanais.map(canal => (
                                    <TableRow key={canal.id}>
                                        <TableCell className="font-medium">{canal.nome}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 text-xs rounded-full ${canal.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {canal.ativo ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => openForm(canal)} disabled={isPending}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                             <Button variant="ghost" size="icon" onClick={() => handleDelete(canal)} disabled={isPending}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredCanais.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">Nenhum canal encontrado.</TableCell>
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
                           Esta ação não pode ser desfeita. O canal será removido permanentemente.
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

'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import type { TipoCurso } from '@/lib/types';
import { saveTipoCursoAction, deleteTipoCursoAction } from '@/actions/cadastros';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export function TiposCursoManager({ initialTiposCurso }: { initialTiposCurso: TipoCurso[] }) {
    const router = useRouter();
    const { toast } = useToast();
    const [tipos, setTipos] = useState<TipoCurso[]>(initialTiposCurso);
    const [editingTipo, setEditingTipo] = useState<TipoCurso | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [filter, setFilter] = useState('');
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [tipoToDelete, setTipoToDelete] = useState<TipoCurso | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        setTipos(initialTiposCurso);
    }, [initialTiposCurso]);

    const openForm = (tipo: TipoCurso | null = null) => {
        setEditingTipo(tipo);
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setEditingTipo(null);
        setIsFormOpen(false);
    };

    const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const nome = formData.get('nome') as string;
        const sigla = formData.get('sigla') as string;
        const ativo = formData.get('ativo') === 'on';

        startTransition(async () => {
            const result = await saveTipoCursoAction({ id: editingTipo?.id, nome, sigla, ativo });
            if (result.success) {
                toast({ title: editingTipo ? 'Tipo de Curso atualizado!' : 'Tipo de Curso adicionado!' });
                router.refresh();
                closeForm();
            } else {
                toast({ variant: 'destructive', title: 'Erro!', description: result.message });
            }
        });
    };

    const handleDelete = (tipo: TipoCurso) => {
        setTipoToDelete(tipo);
        setDeleteConfirmOpen(true);
    };
    
    const confirmDelete = () => {
        if(tipoToDelete) {
            startTransition(async () => {
                const result = await deleteTipoCursoAction(tipoToDelete.id);
                 if (result.success) {
                    toast({ title: `Tipo "${tipoToDelete.nome}" removido.` });
                    router.refresh();
                } else {
                    toast({ variant: 'destructive', title: 'Erro!', description: result.message });
                }
                setDeleteConfirmOpen(false);
                setTipoToDelete(null);
            });
        }
    }

    const filteredTipos = tipos.filter(t => 
        t.nome.toLowerCase().includes(filter.toLowerCase()) || 
        t.sigla.toLowerCase().includes(filter.toLowerCase())
    );

    if (isFormOpen) {
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-xl font-semibold text-foreground">{editingTipo ? 'Editar Tipo de Curso' : 'Novo Tipo de Curso'}</h1>
                    <Button variant="secondary" onClick={closeForm}><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
                </div>
                <Card>
                    <CardContent className="p-6">
                        <form onSubmit={handleSave} className="space-y-6">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="nome">Nome *</Label>
                                    <Input id="nome" name="nome" defaultValue={editingTipo?.nome || ''} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sigla">Sigla *</Label>
                                    <Input id="sigla" name="sigla" defaultValue={editingTipo?.sigla || ''} required />
                                </div>
                            </div>
                             <div className="flex items-center space-x-2 pt-4">
                                <Checkbox id="ativo" name="ativo" defaultChecked={editingTipo?.ativo ?? true} />
                                <Label htmlFor="ativo" className="cursor-pointer">Ativo</Label>
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
                        <CardTitle>Tipos de Cursos</CardTitle>
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
                                <Input id="busca" placeholder="Nome ou sigla" value={filter} onChange={(e) => setFilter(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ordenar">Ordenar por</Label>
                                <Select defaultValue="nome-az">
                                    <SelectTrigger id="ordenar">
                                        <SelectValue placeholder="Nome (A-Z)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="nome-az">Nome (A-Z)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="secondary">
                                    <Search className="mr-2 h-4 w-4" />
                                    Filtrar
                                </Button>
                                <Button variant="destructive-outline" onClick={() => setFilter('')}>
                                    Limpar
                                </Button>
                            </div>
                        </div>
                    </div>
                    
                     <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>NOME</TableHead>
                                    <TableHead>SIGLA</TableHead>
                                    <TableHead>ATIVO</TableHead>
                                    <TableHead className="text-right">AÇÕES</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTipos.map(tipo => (
                                    <TableRow key={tipo.id}>
                                        <TableCell className="font-medium">{tipo.nome}</TableCell>
                                        <TableCell className="font-mono text-primary">{tipo.sigla}</TableCell>
                                        <TableCell>
                                            <Badge variant={tipo.ativo ? 'secondary' : 'destructive'} className={tipo.ativo ? "bg-green-100 text-green-800" : ""}>
                                                {tipo.ativo ? 'Ativo' : 'Inativo'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => openForm(tipo)}>
                                                <Pencil className="h-4 w-4 text-yellow-600" />
                                            </Button>
                                             <Button variant="ghost" size="icon" onClick={() => handleDelete(tipo)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredTipos.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">Nenhum tipo de curso encontrado.</TableCell>
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
                           Esta ação não pode ser desfeita. O tipo de curso será removido permanentemente.
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

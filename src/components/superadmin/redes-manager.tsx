'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { Save, Plus, Trash2, Pencil, Loader2, LayoutDashboard } from 'lucide-react';
import type { Rede } from '@/lib/types';
import { saveRedeAction, deleteRedeAction } from '@/app/superadmin/(app)/redes/actions';

const availableModules = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'matriculas', label: 'Matrículas' },
    { id: 'financeiro', label: 'Financeiro' },
    { id: 'cadastros', label: 'Cadastros' },
    { id: 'ranking', label: 'Ranking' },
];

export function RedesManager({ initialRedes }: { initialRedes: Rede[] }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRede, setEditingRede] = useState<Partial<Rede> | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [redeToDelete, setRedeToDelete] = useState<Rede | null>(null);

    const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const nome = formData.get('nome') as string;

        // Extract all checked modules
        const selectedModules = (formData as any).getAll ? (formData.getAll('modulos') as string[]) : [];

        startTransition(async () => {
            const result = await saveRedeAction({
                id: editingRede?.id,
                nome,
                modulos: selectedModules
            });
            if (result.success) {
                toast({ title: editingRede ? 'Rede atualizada!' : 'Rede criada!' });
                setIsFormOpen(false);
                setEditingRede(null);
            } else {
                toast({ variant: 'destructive', title: 'Erro!', description: result.message });
            }
        });
    };

    const handleDelete = (rede: Rede) => {
        setRedeToDelete(rede);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = () => {
        if (redeToDelete) {
            startTransition(async () => {
                const result = await deleteRedeAction(redeToDelete.id);
                if (result.success) {
                    toast({ title: `Rede "${redeToDelete.nome}" removida.` });
                } else {
                    toast({ variant: 'destructive', title: 'Erro!', description: result.message });
                }
                setDeleteConfirmOpen(false);
                setRedeToDelete(null);
            });
        }
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Gerenciamento de Redes</CardTitle>
                        <Button onClick={() => { setEditingRede(null); setIsFormOpen(true); }}>
                            <Plus className="mr-2 h-4 w-4" />
                            Nova Rede
                        </Button>
                    </div>
                    <CardDescription>
                        Adicione, edite ou remova redes. Cada rede opera como uma entidade separada no sistema.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>NOME DA REDE</TableHead>
                                    <TableHead className="text-right">AÇÕES</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {initialRedes.map(rede => (
                                    <TableRow key={rede.id}>
                                        <TableCell className="font-medium">{rede.nome}</TableCell>
                                        <TableCell className="text-right flex justify-end gap-2">
                                            <Link href={`/superadmin/rede/${rede.id}`} passHref>
                                                <Button variant="outline" size="sm" className="gap-2">
                                                    <LayoutDashboard className="h-4 w-4" />
                                                    Gerenciar
                                                </Button>
                                            </Link>
                                            <Button variant="ghost" size="icon" onClick={() => { setEditingRede(rede); setIsFormOpen(true); }} disabled={isPending}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(rede)} disabled={isPending}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {initialRedes.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={2} className="h-24 text-center">Nenhuma rede cadastrada.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingRede ? 'Editar Rede' : 'Nova Rede'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const nome = formData.get('nome') as string;
                        const selectedModules = (formData as any).getAll ? (formData.getAll('modulos') as string[]) : [];

                        // Helper to read file as base64
                        const readFile = (file: File): Promise<string> => {
                            return new Promise((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onload = () => resolve(reader.result as string);
                                reader.onerror = reject;
                                reader.readAsDataURL(file);
                            });
                        };

                        startTransition(async () => {
                            const logoFile = (formData.get('logoUrl') as File);
                            const logoVerticalFile = (formData.get('logoVerticalUrl') as File);
                            const faviconFile = (formData.get('faviconUrl') as File);

                            let logoUrl = editingRede?.logoUrl;
                            let logoVerticalUrl = editingRede?.logoVerticalUrl;
                            let faviconUrl = editingRede?.faviconUrl;

                            if (logoFile && logoFile.size > 0) {
                                logoUrl = await readFile(logoFile);
                            }
                            if (logoVerticalFile && logoVerticalFile.size > 0) {
                                logoVerticalUrl = await readFile(logoVerticalFile);
                            }
                            if (faviconFile && faviconFile.size > 0) {
                                faviconUrl = await readFile(faviconFile);
                            }

                            const result = await saveRedeAction({
                                id: editingRede?.id,
                                nome,
                                modulos: selectedModules,
                                logoUrl,
                                logoVerticalUrl,
                                faviconUrl
                            });

                            if (result.success) {
                                toast({ title: editingRede ? 'Rede atualizada!' : 'Rede criada!' });
                                setIsFormOpen(false);
                                setEditingRede(null);
                            } else {
                                toast({ variant: 'destructive', title: 'Erro!', description: result.message });
                            }
                        });
                    }}>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="nome">Nome da Rede</Label>
                                <Input id="nome" name="nome" defaultValue={editingRede?.nome || ''} required />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="logoUrl">Logo Principal (Horizontal)</Label>
                                    <Input id="logoUrl" name="logoUrl" type="file" accept="image/*" />
                                    <p className="text-[10px] text-muted-foreground mt-1">Se vazio, usa a do sistema.</p>
                                    {editingRede?.logoUrl && (
                                        <div className="mt-2 border rounded p-2 bg-gray-50 flex justify-center">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={editingRede.logoUrl} alt="Logo Preview" className="h-12 object-contain" />
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="logoVerticalUrl">Logo Vertical / Ícone</Label>
                                    <Input id="logoVerticalUrl" name="logoVerticalUrl" type="file" accept="image/*" />
                                    <p className="text-[10px] text-muted-foreground mt-1">Se vazio, usa o Favicon ou sistema.</p>
                                    {editingRede?.logoVerticalUrl && (
                                        <div className="mt-2 border rounded p-2 bg-gray-50 flex justify-center">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={editingRede.logoVerticalUrl} alt="Icon Preview" className="h-12 object-contain" />
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="faviconUrl">Favicon (Aba do Navegador)</Label>
                                    <Input id="faviconUrl" name="faviconUrl" type="file" accept="image/*" />
                                    <p className="text-[10px] text-muted-foreground mt-1">Se vazio, usa o sistema.</p>
                                    {editingRede?.faviconUrl && (
                                        <div className="mt-2 border rounded p-2 bg-gray-50 flex justify-center">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={editingRede.faviconUrl} alt="Favicon Preview" className="h-8 w-8 object-contain" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Módulos Habilitados</Label>
                                <div className="grid grid-cols-2 gap-4 border p-4 rounded-md">
                                    {availableModules.map((modulo) => (
                                        <div key={modulo.id} className="flex items-center gap-2">
                                            <Checkbox
                                                id={`mod-${modulo.id}`}
                                                name="modulos"
                                                value={modulo.id}
                                                defaultChecked={editingRede?.modulos?.includes(modulo.id)}
                                            />
                                            <Label htmlFor={`mod-${modulo.id}`} className="font-normal cursor-pointer">
                                                {modulo.label}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Salvar
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Excluir uma rede pode impactar todos os dados associados a ela (usuários, matrículas, etc.).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar Exclusão
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

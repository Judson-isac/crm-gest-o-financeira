'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getSuperAdminsAction, saveSuperAdminAction, deleteSuperAdminAction } from '@/actions/superadmin';
import { Loader2, Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Admin = {
    id: string;
    nome: string;
    email: string;
    status: string;
    isSuperadmin: boolean;
};

export default function AdminsPage() {
    const { toast } = useToast();
    const [admins, setAdmins] = useState<Admin[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);

    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        senha: '',
    });

    const loadAdmins = async () => {
        setIsLoading(true);
        const result = await getSuperAdminsAction();
        if (result.success && result.data) {
            setAdmins(result.data as Admin[]);
        } else {
            toast({
                variant: 'destructive',
                title: 'Erro ao carregar',
                description: result.message
            });
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadAdmins();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload: any = {
            id: editingAdmin?.id,
            nome: formData.nome,
            email: formData.email,
        };
        if (formData.senha) payload.senha = formData.senha;

        const result = await saveSuperAdminAction(payload);
        if (result.success) {
            toast({
                title: 'Sucesso!',
                description: 'Administrador salvo com sucesso.'
            });
            setIsDialogOpen(false);
            setEditingAdmin(null);
            setFormData({ nome: '', email: '', senha: '' });
            loadAdmins();
        } else {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: result.message
            });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este administrador?")) return;

        const result = await deleteSuperAdminAction(id);
        if (result.success) {
            toast({
                title: 'Removido',
                description: 'Administrador removido com sucesso.'
            });
            loadAdmins();
        } else {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: result.message
            });
        }
    };

    const openEdit = (admin: Admin) => {
        setEditingAdmin(admin);
        setFormData({ nome: admin.nome, email: admin.email, senha: '' });
        setIsDialogOpen(true);
    };

    const openCreate = () => {
        setEditingAdmin(null);
        setFormData({ nome: '', email: '', senha: '' });
        setIsDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Administradores</h2>
                    <p className="text-muted-foreground">Gerencie o acesso total ao sistema.</p>
                </div>
                <Button onClick={openCreate} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Admin
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Lista de Super Admins</CardTitle>
                    <CardDescription>Usuários com permissão total de gerenciamento.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead className="w-[100px] text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {admins.map((admin) => (
                                    <TableRow key={admin.id}>
                                        <TableCell className="font-medium">{admin.nome}</TableCell>
                                        <TableCell>{admin.email}</TableCell>
                                        <TableCell className="text-right flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(admin)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(admin.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {admins.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                            Nenhum administrador encontrado.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingAdmin ? 'Editar Administrador' : 'Novo Administrador'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nome</label>
                            <Input
                                required
                                value={formData.nome}
                                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                placeholder="Nome completo"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <Input
                                required
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                placeholder="email@exemplo.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Senha</label>
                            <Input
                                type="password"
                                value={formData.senha}
                                onChange={e => setFormData({ ...formData, senha: e.target.value })}
                                placeholder={editingAdmin ? "Deixe em branco para manter" : "Mínimo 6 caracteres"}
                                minLength={editingAdmin ? undefined : 6}
                                required={!editingAdmin}
                            />
                            {editingAdmin && <p className="text-xs text-muted-foreground">Preencha apenas se desejar alterar a senha.</p>}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit">Salvar</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

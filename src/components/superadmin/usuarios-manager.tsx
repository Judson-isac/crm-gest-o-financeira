
'use client';

import { useState, useTransition, useEffect } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Loader2, Save } from 'lucide-react';
import type { Usuario, Rede, Funcao } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { saveUsuarioAction, deleteUsuarioAction } from '@/app/superadmin/(app)/usuarios/actions';

const getInitials = (name: string) => {
  if (!name) return '';
  const names = name.split(' ');
  const initials = names.map(n => n[0]).join('');
  return initials.length > 2 ? initials.substring(0, 2) : initials;
}

interface SuperAdminUsuariosManagerProps {
  initialUsuarios: (Omit<Usuario, 'senha'> & { polos?: string[] })[];
  redes: Rede[];
  funcoes: Funcao[];
  redeId?: string; // Optional: if provided, locks the manager to this network
}

export function SuperAdminUsuariosManager({ initialUsuarios, redes, funcoes, redeId }: SuperAdminUsuariosManagerProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Partial<Usuario> | null>(null);
  // If redeId is provided via props, use it. Otherwise fall back to editing user's rede or undefined.
  const [selectedRedeId, setSelectedRedeId] = useState<string | undefined>(redeId || editingUsuario?.redeId);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [usuarioToDelete, setUsuarioToDelete] = useState<Omit<Usuario, 'senha'> | null>(null);
  const [redeFilter, setRedeFilter] = useState<string>(redeId || 'all');

  useEffect(() => {
    // When editing a user, update selectedRedeId unless locked by props
    if (!redeId) {
      setSelectedRedeId(editingUsuario?.redeId);
    }
  }, [editingUsuario, redeId]);

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const redeId = formData.get('redeId') as string;
    const data: Partial<Usuario> = {
      id: editingUsuario?.id,
      nome: formData.get('nome') as string,
      email: formData.get('email') as string,
      funcao: formData.get('funcao') as string,
      rede: redes.find(r => r.id === redeId)?.nome,
      redeId: redeId,
      status: 'Verificado',
    };

    const senha = formData.get('senha') as string;
    if (senha) {
      data.senha = senha;
    }

    if (!redeId) {
      toast({ variant: 'destructive', title: 'Erro!', description: 'A rede é obrigatória.' });
      return;
    }

    startTransition(async () => {
      const result = await saveUsuarioAction(data);
      if (result.success) {
        toast({ title: editingUsuario ? 'Usuário atualizado!' : 'Usuário criado!' });
        setIsFormOpen(false);
        setEditingUsuario(null);
      } else {
        toast({ variant: 'destructive', title: 'Erro!', description: result.message });
      }
    });
  };

  const handleDelete = (usuario: Omit<Usuario, 'senha'>) => {
    setUsuarioToDelete(usuario);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!usuarioToDelete?.id) return;

    startTransition(async () => {
      const result = await deleteUsuarioAction(usuarioToDelete.id!);
      if (result.success) {
        toast({ title: `Usuário "${usuarioToDelete.nome}" removido.` });
      } else {
        toast({ variant: 'destructive', title: 'Erro!', description: result.message });
      }
      setDeleteConfirmOpen(false);
      setUsuarioToDelete(null);
    });
  };

  const filteredUsuarios = initialUsuarios.filter(user =>
    redeFilter === 'all' || user.redeId === redeFilter
  );

  const availableFuncoes = funcoes.filter(f => f.redeId === selectedRedeId && f.nome !== 'Superadmin');

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Gerenciamento de Usuários</CardTitle>
            <Button onClick={() => { setEditingUsuario(null); setSelectedRedeId(undefined); setIsFormOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </div>
          <CardDescription>
            Crie, edite e remova usuários para todas as redes.
          </CardDescription>
          {!redeId && (
            <div className="pt-4">
              <Label htmlFor="rede-filter">Filtrar por Rede</Label>
              <Select value={redeFilter} onValueChange={setRedeFilter}>
                <SelectTrigger id="rede-filter" className="max-w-sm">
                  <SelectValue placeholder="Filtrar por rede..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Redes</SelectItem>
                  {redes.map(rede => (
                    <SelectItem key={rede.id} value={rede.id}>{rede.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Rede</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Polos Permitidos (da Função)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsuarios.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                          <AvatarImage src={user.avatarUrl} />
                          <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                            {getInitials(user.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold">{user.nome}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-medium">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.rede}</TableCell>
                    <TableCell>{user.funcao}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {(user as any).polos && (user as any).polos.length > 0
                        ? ((user as any).polos.length > 3 ? `${(user as any).polos.slice(0, 3).join(', ')} e mais ${(user as any).polos.length - 3}` : (user as any).polos.join(', '))
                        : 'Todos da Rede'}
                    </TableCell>
                    <TableCell className="text-green-600">{user.status}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => { setEditingUsuario(user); setIsFormOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(user)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsuarios.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">Nenhum usuário encontrado para esta rede.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
            <DialogDescription>Preencha os detalhes do usuário abaixo. O acesso aos polos é definido pela Função.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input id="nome" name="nome" defaultValue={editingUsuario?.nome || ''} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" defaultValue={editingUsuario?.email || ''} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input id="senha" name="senha" type="password" placeholder={editingUsuario ? 'Deixe em branco para não alterar' : ''} required={!editingUsuario} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rede">Rede</Label>
                  <Select name="redeId" defaultValue={editingUsuario?.redeId} onValueChange={setSelectedRedeId} required>
                    <SelectTrigger><SelectValue placeholder="Selecione uma rede..." /></SelectTrigger>
                    <SelectContent>
                      {redes.map(rede => <SelectItem key={rede.id} value={rede.id}>{rede.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="funcao">Função</Label>
                  <Select name="funcao" defaultValue={editingUsuario?.funcao} disabled={!selectedRedeId}>
                    <SelectTrigger><SelectValue placeholder="Selecione uma função..." /></SelectTrigger>
                    <SelectContent>
                      {availableFuncoes.map(funcao => <SelectItem key={funcao.id} value={funcao.nome}>{funcao.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isPending || !selectedRedeId}>
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
              Esta ação não pode ser desfeita. O usuário será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isPending} className={buttonVariants({ variant: "destructive" })}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

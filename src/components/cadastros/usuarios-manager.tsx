'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
import type { Usuario } from '@/lib/types';
import { saveUsuarioAction, deleteUsuarioAction } from '@/actions/cadastros';
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

const getInitials = (name: string) => {
    const names = name.split(' ');
    const initials = names.map(n => n[0]).join('');
    return initials.length > 2 ? initials.substring(0, 2) : initials;
}

export function UsuariosManager({ initialUsuarios }: { initialUsuarios: Usuario[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Partial<Usuario> | null>(null);
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [usuarioToDelete, setUsuarioToDelete] = useState<Usuario | null>(null);

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data: Partial<Usuario> = {
      id: editingUsuario?.id,
      nome: formData.get('nome') as string,
      email: formData.get('email') as string,
      funcao: formData.get('funcao') as string,
      status: 'Verificado',
    };
    
    const senha = formData.get('senha') as string;
    if (senha) {
        data.senha = senha;
    }

    startTransition(async () => {
      const result = await saveUsuarioAction(data);
      if (result.success) {
        toast({ title: editingUsuario ? 'Usuário atualizado!' : 'Usuário criado!' });
        setIsFormOpen(false);
        router.refresh();
      } else {
        toast({ variant: 'destructive', title: 'Erro!', description: result.message });
      }
    });
  };

  const handleDelete = (usuario: Usuario) => {
    setUsuarioToDelete(usuario);
    setDeleteConfirmOpen(true);
  };
  
  const confirmDelete = () => {
    if (!usuarioToDelete) return;
    startTransition(async () => {
      const result = await deleteUsuarioAction(usuarioToDelete.id);
      if (result.success) {
        toast({ title: `Usuário "${usuarioToDelete.nome}" removido.` });
        router.refresh();
      } else {
        toast({ variant: 'destructive', title: 'Erro!', description: result.message });
      }
      setDeleteConfirmOpen(false);
      setUsuarioToDelete(null);
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Usuários</CardTitle>
            <Button onClick={() => { setEditingUsuario(null); setIsFormOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </div>
          <CardDescription>
            Gerencie os usuários do sistema, suas funções e permissões.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <ul className="divide-y divide-border">
              {initialUsuarios.map(user => (
                <li key={user.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                        <Avatar>
                            <AvatarImage src={user.avatarUrl} />
                            <AvatarFallback>{getInitials(user.nome)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold">{user.nome}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-8 text-sm">
                        <p className="w-32">{user.funcao}</p>
                        <p className="w-24 text-green-600">{user.status}</p>
                        <div className="flex items-center gap-2">
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => { setEditingUsuario(user); setIsFormOpen(true); }}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(user)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
         <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
                <DialogDescription>Preencha os detalhes do usuário abaixo.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave}>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="nome">Nome Completo</Label>
                        <Input id="nome" name="nome" defaultValue={editingUsuario?.nome} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <Input id="email" name="email" type="email" defaultValue={editingUsuario?.email} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="senha">Senha</Label>
                        <Input id="senha" name="senha" type="password" placeholder={editingUsuario ? 'Deixe em branco para não alterar' : ''} required={!editingUsuario} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="funcao">Função</Label>
                        <Select name="funcao" defaultValue={editingUsuario?.funcao || 'Agente 2'}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Administrador">Administrador</SelectItem>
                                <SelectItem value="Agente 2">Agente 2</SelectItem>
                                <SelectItem value="Agente 1">Agente 1</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
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

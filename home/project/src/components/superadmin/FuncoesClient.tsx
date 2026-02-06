
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
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
import { useToast } from '@/hooks/use-toast';
import { Save, Plus, Trash2, Pencil, Loader2, CheckCircle, XCircle } from 'lucide-react';
import type { Funcao, Permissoes, Rede } from '@/lib/types';
import { handleSaveFuncao, handleDeleteFuncao } from '@/app/superadmin/(app)/funcoes/actions';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';

interface FuncoesClientProps {
  funcoes: (Funcao & { nomeRede: string })[];
  redes: Rede[];
  permissoesDisponiveis: { key: keyof Permissoes; label: string }[];
}

export default function FuncoesClient({ funcoes, redes, permissoesDisponiveis }: FuncoesClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFuncao, setEditingFuncao] = useState<Partial<Funcao> & { nomeRede?: string } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [funcaoToDelete, setFuncaoToDelete] = useState<Funcao | null>(null);

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nome = formData.get('nome') as string;
    const redeId = formData.get('redeId') as string;
    
    const permissoes: Partial<Permissoes> = {};
    for (const { key } of permissoesDisponiveis) {
        permissoes[key] = formData.get(key) === 'on';
    }

    startTransition(async () => {
      const result = await handleSaveFuncao({
        id: editingFuncao?.id,
        nome,
        permissoes: permissoes as Permissoes,
        redeId: redeId,
      });
      if (result.success) {
        toast({ title: editingFuncao ? 'Função atualizada!' : 'Função criada!' });
        setIsFormOpen(false);
        router.refresh();
      } else {
        toast({ variant: 'destructive', title: 'Erro!', description: result.message });
      }
    });
  };

  const handleDelete = (funcao: Funcao) => {
    setFuncaoToDelete(funcao);
    setDeleteConfirmOpen(true);
  };
  
  const handleOpenForm = (funcao: Partial<Funcao> | null) => {
      setEditingFuncao(funcao);
      setIsFormOpen(true);
  }

  const confirmDelete = () => {
    if (funcaoToDelete?.id) {
      startTransition(async () => {
        const result = await handleDeleteFuncao(funcaoToDelete.id!);
        if (result.success) {
          toast({ title: `Função "${funcaoToDelete.nome}" removida.` });
          router.refresh();
        } else {
          toast({ variant: 'destructive', title: 'Erro!', description: result.message });
        }
        setDeleteConfirmOpen(false);
        setFuncaoToDelete(null);
      });
    }
  };
  
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Funções e Permissões</CardTitle>
            <Button onClick={() => handleOpenForm(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Função
            </Button>
          </div>
          <CardDescription>Crie e gerencie as funções e permissões dos usuários do sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Função</TableHead>
                  <TableHead>Rede</TableHead>
                  <TableHead>Permissões</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funcoes.map(funcao => (
                  <TableRow key={funcao.id}>
                    <TableCell className="font-medium">{funcao.nome}</TableCell>
                    <TableCell>{funcao.nomeRede}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                            {permissoesDisponiveis.map(({ key, label }) => (
                                <span key={key} className="flex items-center gap-1">
                                    {funcao.permissoes?.[key] ? <CheckCircle className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500"/>}
                                    {label}
                                </span>
                            ))}
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={() => handleOpenForm(funcao)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                         <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(funcao)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingFuncao ? 'Editar Função' : 'Nova Função'}</DialogTitle>
            <DialogDescription>Defina o nome, a rede e as permissões para esta função.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Função</Label>
                  <Input id="nome" name="nome" defaultValue={editingFuncao?.nome || ''} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="redeId">Rede</Label>
                  <Select name="redeId" defaultValue={editingFuncao?.redeId} required>
                      <SelectTrigger><SelectValue placeholder="Selecione uma rede..."/></SelectTrigger>
                      <SelectContent>
                      {redes.map(rede => <SelectItem key={rede.id} value={rede.id}>{rede.nome}</SelectItem>)}
                      </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Permissões</Label>
                <div className="grid grid-cols-1 gap-4 rounded-md border p-4 h-full">
                  {permissoesDisponiveis.map(({key, label}) => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        id={`perm-${key}`}
                        name={key}
                        defaultChecked={editingFuncao?.permissoes?.[key] ?? false}
                      />
                      <Label htmlFor={`perm-${key}`} className="text-sm font-normal">{label}</Label>
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
                Esta ação não pode ser desfeita. A função será removida permanentemente e pode afetar os usuários associados a ela.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} disabled={isPending} className={buttonVariants({ variant: "destructive" })}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Exclusão
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </>
  );
}

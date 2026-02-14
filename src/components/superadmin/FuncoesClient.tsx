
'use client';

import { useState, useTransition, useEffect } from 'react';
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
import { saveFuncaoAction, deleteFuncaoAction } from '@/actions/cadastros';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { MultiSelect } from '../ui/multi-select';

interface FuncoesClientProps {
  funcoes: (Funcao & { nomeRede: string })[];
  redes: Rede[];
  permissoesDisponiveis: { key: keyof Permissoes; label: string }[];
  allPolos: string[];
  redeId?: string; // Optional: Locks to this network
}

export default function FuncoesClient({ funcoes, redes, permissoesDisponiveis, allPolos, redeId }: FuncoesClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFuncao, setEditingFuncao] = useState<Partial<Funcao> & { nomeRede?: string } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [funcaoToDelete, setFuncaoToDelete] = useState<Funcao | null>(null);

  const [selectedPolos, setSelectedPolos] = useState<string[]>([]);
  // Initialize with prop redeId if available, else standard fallback
  const [selectedRedeId, setSelectedRedeId] = useState<string | undefined>(redeId);

  useEffect(() => {
    if (editingFuncao) {
      setSelectedPolos(editingFuncao.polos || []);
      if (!redeId) setSelectedRedeId(editingFuncao.redeId);
    } else {
      setSelectedPolos([]);
      if (!redeId) setSelectedRedeId(redes.length === 1 ? redes[0].id : undefined);
    }
  }, [editingFuncao, redes, redeId]);

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nome = formData.get('nome') as string;

    // Use prop redeId if locked, otherwise form data
    const finalRedeId = redeId || (redes.length === 1 ? redes[0].id : formData.get('redeId') as string);

    const permissoes: Partial<Permissoes> = {};
    for (const { key } of permissoesDisponiveis) {
      permissoes[key] = formData.get(key) === 'on';
    }

    if (!finalRedeId) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Uma rede deve ser selecionada.' });
      return;
    }

    startTransition(async () => {
      const result = await saveFuncaoAction({
        id: editingFuncao?.id,
        nome,
        permissoes: permissoes as Permissoes,
        redeId: finalRedeId,
        polos: selectedPolos,
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
    setSelectedPolos(funcao?.polos || []);
    if (redes.length === 1 && !funcao) {
      setSelectedRedeId(redes[0].id);
    } else {
      setSelectedRedeId(funcao?.redeId);
    }
    setIsFormOpen(true);
  }

  const confirmDelete = () => {
    if (funcaoToDelete?.id) {
      startTransition(async () => {
        const result = await deleteFuncaoAction(funcaoToDelete.id!);
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

  const poloOptions = allPolos.map(p => ({ label: p, value: p }));

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
          <CardDescription>Crie e gerencie as funções e permissões dos usuários, incluindo acesso a polos específicos.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Função</TableHead>
                  {redes.length > 1 && <TableHead>Rede</TableHead>}
                  <TableHead>Polos Permitidos</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funcoes.filter(f => f.nome !== 'Superadmin' && f.nome !== 'Superadministrador').map(funcao => (
                  <TableRow key={funcao.id}>
                    <TableCell className="font-medium">{funcao.nome}</TableCell>
                    {redes.length > 1 && <TableCell>{funcao.nomeRede}</TableCell>}
                    <TableCell className="text-xs text-muted-foreground">
                      {funcao.polos && funcao.polos.length > 0
                        ? (funcao.polos.length > 3 ? `${funcao.polos.slice(0, 3).join(', ')} e mais ${funcao.polos.length - 3}` : funcao.polos.join(', '))
                        : 'Todos os polos da rede'}
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
            <DialogDescription>Defina o nome, a rede, as permissões e os polos para esta função.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Função</Label>
                  <Input id="nome" name="nome" defaultValue={editingFuncao?.nome || ''} required />
                </div>

                {(redes.length > 1 && !redeId) ? (
                  <div className="space-y-2">
                    <Label htmlFor="redeId">Rede</Label>
                    <Select name="redeId" defaultValue={editingFuncao?.redeId} onValueChange={setSelectedRedeId} required>
                      <SelectTrigger><SelectValue placeholder="Selecione uma rede..." /></SelectTrigger>
                      <SelectContent>
                        {redes.map(rede => <SelectItem key={rede.id} value={rede.id}>{rede.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Rede</Label>
                    <Input value={redes.find(r => r.id === (redeId || selectedRedeId))?.nome || redes[0]?.nome || 'Carregando...'} disabled />
                    {/* Ensure value is submitted */}
                    <input type="hidden" name="redeId" value={redeId || selectedRedeId || (redes.length === 1 ? redes[0].id : '')} />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Polos Permitidos</Label>
                  <MultiSelect
                    options={poloOptions}
                    onValueChange={setSelectedPolos}
                    defaultValue={selectedPolos}
                    placeholder="Todos os polos da rede"
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">Se nenhum polo for selecionado, o usuário terá acesso a todos os polos da rede.</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Permissões</Label>
                <div className="grid grid-cols-1 gap-4 rounded-md border p-4 h-full">
                  <div className="grid grid-cols-1 gap-4 rounded-md border p-4 h-full">
                    {(() => {
                      const rede = redes.find(r => r.id === (redeId || selectedRedeId));
                      // If network selected but has NO modules defined or empty array -> Show "All Disabled" (strict mode) or "All Enabled" (legacy)?
                      // User said: "se tiver tudo desmarcado a rede n tem acesso a nada"
                      // So if modules is specific and empty, we show NOTHING.
                      // If modules is completely missing (undefined) maybe legacy? But we added column.
                      // Let's assume strict: If modules array exists and is empty, nothing matches.

                      // BUT: We need to know if the network *has* the modules property loaded. 
                      // The user request implies strictness.
                      // Filter available permissions based on modules

                      const activePermissions = permissoesDisponiveis.filter(p => {
                        if (!rede || !rede.modulos || rede.modulos.length === 0) return false; // Strict: No modules = No permissions
                        const moduleMap: Record<string, string[]> = {
                          'dashboard': ['verDashboard', 'verRelatoriosFinanceiros'],
                          'matriculas': ['gerenciarMatriculas', 'realizarImportacoes'],
                          'financeiro': ['verRelatoriosFinanceiros'],
                          'cadastros': ['gerenciarCadastrosGerais', 'gerenciarUsuarios'],
                          'ranking': ['verRanking'],
                          'whatsapp': ['gerenciarWhatsapp']
                        };
                        return rede.modulos.some(mod => moduleMap[mod]?.includes(p.key));
                      });

                      if (activePermissions.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center h-full text-center p-4 text-muted-foreground">
                            <XCircle className="h-8 w-8 mb-2 opacity-20" />
                            <p>Nenhum módulo habilitado para esta rede.</p>
                            <p className="text-xs mt-1">Habilite módulos nas configurações da rede para liberar permissões.</p>
                          </div>
                        );
                      }

                      return activePermissions.map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-2">
                          <Checkbox
                            id={`perm-${key}`}
                            name={key}
                            defaultChecked={editingFuncao?.permissoes?.[key] ?? false}
                          />
                          <Label htmlFor={`perm-${key}`} className="text-sm font-normal cursor-pointer select-none">{label}</Label>
                        </div>
                      ));
                    })()}
                  </div>
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

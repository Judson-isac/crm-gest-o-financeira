'use client';
import { useState, useTransition, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, ArrowLeft, Loader2, Save, Trash2, Pencil, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Meta } from '@/lib/types';
import { saveMetaAction, deleteMetaAction } from '@/actions/cadastros';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type MetasRedePoloManagerProps = {
  initialMetas: Meta[];
  polos: string[];
  tiposDeCurso: string[];
  processosSeletivos: string[];
};

export function MetasRedePoloManager({ initialMetas, polos, tiposDeCurso, processosSeletivos }: MetasRedePoloManagerProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [metas, setMetas] = useState(initialMetas);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState<Meta | null>(null);
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [metaToDelete, setMetaToDelete] = useState<Meta | null>(null);
  
  // Filters
  const [poloFilter, setPoloFilter] = useState('all');
  const [tipoCursoFilter, setTipoCursoFilter] = useState('all');
  const [processoFilter, setProcessoFilter] = useState('all');

  useEffect(() => {
    setMetas(initialMetas);
  }, [initialMetas]);

  const filteredMetas = useMemo(() => {
    return metas.filter(meta => {
        const poloMatch = poloFilter === 'all' || meta.polo === poloFilter;
        const tipoCursoMatch = tipoCursoFilter === 'all' || meta.tipoCurso === tipoCursoFilter;
        const processoMatch = processoFilter === 'all' || meta.processoSeletivo === processoFilter;
        return poloMatch && tipoCursoMatch && processoMatch;
    });
  }, [metas, poloFilter, tipoCursoFilter, processoFilter]);

  const openForm = (meta: Meta | null = null) => {
    setEditingMeta(meta);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setEditingMeta(null);
    setIsFormOpen(false);
  };

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data: Partial<Meta> = {
        id: editingMeta?.id,
        polo: formData.get('polo') as string,
        tipoCurso: formData.get('tipo-curso') as string,
        processoSeletivo: formData.get('processo-seletivo') as string,
        metaQtd: Number(formData.get('meta-qtd')),
        ticketMedio: Number(formData.get('ticket-medio')),
        metaRPV: Number(formData.get('meta-rpv')),
        ativo: formData.get('ativo') === 'on',
        realizadas: editingMeta?.realizadas || 0,
    };

    startTransition(async () => {
      const result = await saveMetaAction(data);
      if (result.success) {
        toast({ title: editingMeta ? 'Meta atualizada!' : 'Meta criada!' });
        closeForm();
        router.refresh();
      } else {
        toast({ variant: 'destructive', title: 'Erro!', description: result.message });
      }
    });
  };

  const handleDelete = (meta: Meta) => {
    setMetaToDelete(meta);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!metaToDelete) return;
    startTransition(async () => {
      const result = await deleteMetaAction(metaToDelete.id);
      if (result.success) {
        toast({ title: 'Meta removida!' });
        router.refresh();
      } else {
        toast({ variant: 'destructive', title: 'Erro!', description: result.message });
      }
      setDeleteConfirmOpen(false);
      setMetaToDelete(null);
    });
  };
  
  if (isFormOpen) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-semibold text-foreground">{editingMeta ? 'Editar Meta' : 'Nova Meta — Polo/Tipo/Processo'}</h1>
                 <Button variant="secondary" onClick={closeForm}><ArrowLeft className="mr-2 h-4 w-4"/>Voltar</Button>
            </div>
            <Card>
                <CardContent className="p-6">
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="polo">Polo *</Label>
                                <Select name="polo" required defaultValue={editingMeta?.polo}>
                                    <SelectTrigger id="polo"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent>
                                        {polos.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tipo-curso">Tipo de Curso *</Label>
                                <Select name="tipo-curso" required defaultValue={editingMeta?.tipoCurso}>
                                    <SelectTrigger id="tipo-curso"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent>
                                        {tiposDeCurso.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="processo-seletivo">Processo Seletivo *</Label>
                                <Select name="processo-seletivo" required defaultValue={editingMeta?.processoSeletivo}>
                                    <SelectTrigger id="processo-seletivo"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent>
                                        {processosSeletivos.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4 items-end">
                            <div className="space-y-2">
                                <Label htmlFor="meta-qtd">Meta (Qtd.) *</Label>
                                <Input id="meta-qtd" name="meta-qtd" type="number" defaultValue={editingMeta?.metaQtd || ''} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ticket-medio">Ticket Médio *</Label>
                                <Input id="ticket-medio" name="ticket-medio" type="number" step="0.01" defaultValue={editingMeta?.ticketMedio || ''} required />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="meta-rpv">Meta RPV *</Label>
                                <Input id="meta-rpv" name="meta-rpv" type="number" step="0.01" defaultValue={editingMeta?.metaRPV || ''} required />
                            </div>
                            <div className="flex items-center space-x-2 pb-1">
                                <Checkbox id="ativo" name="ativo" defaultChecked={editingMeta?.ativo ?? true} />
                                <Label htmlFor="ativo" className="cursor-pointer">Ativo</Label>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t">
                            <Button type="submit" disabled={isPending}>
                               {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                                Salvar
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Metas – Polo/Tipo/Processo</CardTitle>
            <Button onClick={() => openForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Meta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="space-y-2">
                    <Label>Polo</Label>
                    <Select value={poloFilter} onValueChange={setPoloFilter}>
                        <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Polos</SelectItem>
                            {polos.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Tipo Curso</Label>
                    <Select value={tipoCursoFilter} onValueChange={setTipoCursoFilter}>
                        <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Tipos</SelectItem>
                            {tiposDeCurso.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Proc. Seletivo</Label>
                    <Select value={processoFilter} onValueChange={setProcessoFilter}>
                        <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Processos</SelectItem>
                            {processosSeletivos.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex gap-2 items-end col-span-1 md:col-span-2">
                  <Button variant="secondary" className='w-full' onClick={() => router.refresh()}>
                    <Search className="mr-2 h-4 w-4"/>Filtrar
                  </Button>
                   <Button variant="destructive-outline" className='w-full' onClick={() => { setPoloFilter('all'); setTipoCursoFilter('all'); setProcessoFilter('all'); }}>
                    Limpar
                  </Button>
                </div>
            </div>
          </div>
          
          <div className="border rounded-lg">
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>POLO</TableHead>
                          <TableHead>TIPO CURSO</TableHead>
                          <TableHead>PROC. SELETIVO</TableHead>
                          <TableHead>META</TableHead>
                          <TableHead>REALIZADAS</TableHead>
                          <TableHead>% EXEC.</TableHead>
                          <TableHead>ATIVO</TableHead>
                          <TableHead className="text-right">AÇÕES</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {filteredMetas.map(meta => {
                          const percentExec = meta.metaQtd > 0 ? (meta.realizadas / meta.metaQtd) : 0;
                          return (
                              <TableRow key={meta.id}>
                                  <TableCell>{meta.polo}</TableCell>
                                  <TableCell>{meta.tipoCurso}</TableCell>
                                  <TableCell>{meta.processoSeletivo}</TableCell>
                                  <TableCell>{meta.metaQtd}</TableCell>
                                  <TableCell>{meta.realizadas}</TableCell>
                                  <TableCell>{percentExec.toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 2 })}</TableCell>
                                  <TableCell>
                                      <Badge variant={meta.ativo ? 'secondary' : 'destructive'} className={meta.ativo ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}>{meta.ativo ? 'Ativo' : 'Inativo'}</Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                      <Button variant="ghost" size="icon" onClick={() => openForm(meta)} className="mr-2">
                                        <Pencil className="h-4 w-4 text-yellow-600"/>
                                      </Button>
                                      <Button variant="ghost" size="icon" onClick={() => handleDelete(meta)}>
                                        <Trash2 className="h-4 w-4 text-destructive"/>
                                      </Button>
                                  </TableCell>
                              </TableRow>
                          )
                      })}
                       {filteredMetas.length === 0 && (
                          <TableRow>
                              <TableCell colSpan={8} className="h-24 text-center">
                                  Nenhuma meta encontrada para os filtros selecionados.
                              </TableCell>
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
              Esta ação não pode ser desfeita. A meta será removida permanentemente.
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


"use client";
import { useState, useTransition, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Edit, Trash2, Download } from 'lucide-react';
import { deleteCursoAction, deleteCursosAction } from '@/actions/cursos';
import type { Curso, TipoCurso } from '@/lib/types';
import { AddEditCourseDialog } from './add-edit-course-dialog';
import { Checkbox } from '@/components/ui/checkbox';
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

type CursosListProps = {
  initialCursos?: Curso[];
  cursos?: Curso[];
  onDataChanged?: () => void;
  isLoading?: boolean;
  courseTypes?: TipoCurso[];
};

export function CursosList({ initialCursos, courseTypes = [], cursos: cursosProp, onDataChanged, isLoading = false }: CursosListProps) {
  const { toast } = useToast();
  const [cursos, setCursos] = useState<Curso[]>(initialCursos || cursosProp || []);
  const router = useRouter();
  const [filter, setFilter] = useState('');
  const [isDeleting, startDeleteTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCurso, setEditingCurso] = useState<Curso | null>(null);

  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Update cursos when prop changes
  useEffect(() => {
    if (cursosProp) setCursos(cursosProp);
  }, [cursosProp]);

  const handleDataChanged = () => {
    if (onDataChanged) {
      onDataChanged();
    } else {
      // If no callback, use router.refresh() to re-fetch server data
      router.refresh();
    }
  };

  const filteredCursos = useMemo(() => cursos.filter(
    curso =>
      curso.nome.toLowerCase().includes(filter.toLowerCase()) ||
      curso.sigla.toLowerCase().includes(filter.toLowerCase()) ||
      (curso.sigla_alternativa && curso.sigla_alternativa.toLowerCase().includes(filter.toLowerCase())) ||
      (curso.nicho && curso.nicho.toLowerCase().includes(filter.toLowerCase()))
  ), [cursos, filter]);

  const handleOpenDialog = (curso: Curso | null = null) => {
    setEditingCurso(curso);
    setDialogOpen(true);
  };

  const handleDelete = (sigla: string) => {
    startDeleteTransition(async () => {
      const result = await deleteCursoAction(sigla);
      if (result.success) {
        toast({ title: 'Sucesso!', description: 'Curso excluído.' });
        if (onDataChanged) onDataChanged();
      } else {
        toast({ variant: 'destructive', title: 'Erro!', description: result.message });
      }
    })
  }

  const handleDeleteSelected = () => {
    startDeleteTransition(async () => {
      const result = await deleteCursosAction(selectedRows);
      if (result.success) {
        toast({ title: "Sucesso!", description: result.message });
        setSelectedRows([]);
        handleDataChanged();
      } else {
        toast({ variant: "destructive", title: "Erro", description: result.message });
      }
      setDeleteConfirmOpen(false);
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(filteredCursos.map(c => c.sigla));
    } else {
      setSelectedRows([]);
    }
  }

  const handleSelectRow = (sigla: string, checked: boolean) => {
    setSelectedRows(prev => checked ? [...prev, sigla] : prev.filter(s => s !== sigla));
  }

  const handleDownload = () => {
    if (!cursos || cursos.length === 0) {
      toast({ variant: 'destructive', title: 'Nada para baixar', description: 'Não há cursos cadastrados para exportar.' });
      return;
    }

    const dataToDownload = {
      CURSOS: cursos,
    };

    const jsonString = JSON.stringify(dataToDownload, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cursos_cadastrados.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  const numSelected = selectedRows.length;
  const numFiltered = filteredCursos.length;
  const allSelected = numFiltered > 0 && numSelected === numFiltered;
  const isIndeterminate = numSelected > 0 && numSelected < numFiltered;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <CardTitle>Cursos Cadastrados</CardTitle>
              <CardDescription>
                Visualize, adicione, edite ou remova os cursos e suas traduções.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {selectedRows.length > 0 && (
                <Button variant="destructive" onClick={() => setDeleteConfirmOpen(true)} disabled={isDeleting}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir ({selectedRows.length})
                </Button>
              )}
              <Button variant="outline" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Baixar Cursos
              </Button>
              <Button onClick={() => handleOpenDialog()}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Curso
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <Input
              placeholder="Filtrar por nome, sigla ou nicho..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[60vh] w-full rounded-md border">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allSelected || isIndeterminate}
                        onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                        aria-label="Selecionar todas as linhas"
                        data-state={isIndeterminate ? 'indeterminate' : (allSelected ? 'checked' : 'unchecked')}
                      />
                    </TableHead>
                    <TableHead>Nome do Curso</TableHead>
                    <TableHead>Modalidade</TableHead>
                    <TableHead>Sigla</TableHead>
                    <TableHead>Sigla Alternativa</TableHead>
                    <TableHead>Metodologia</TableHead>
                    <TableHead>Nicho</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCursos.length > 0 ? (
                    filteredCursos.map(curso => (
                      <TableRow key={curso.sigla} data-state={selectedRows.includes(curso.sigla) ? "selected" : "unselected"}>
                        <TableCell>
                          <Checkbox
                            checked={selectedRows.includes(curso.sigla)}
                            onCheckedChange={(checked) => handleSelectRow(curso.sigla, checked as boolean)}
                            aria-label="Selecionar linha"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{curso.nome}</TableCell>
                        <TableCell>
                          {courseTypes.find(t => t.id === curso.tipoCursoId)?.nome || (
                            <span className="text-muted-foreground italic text-xs">Sem Vínculo</span>
                          )}
                        </TableCell>
                        <TableCell>{curso.sigla}</TableCell>
                        <TableCell>{curso.sigla_alternativa || 'N/A'}</TableCell>
                        <TableCell>{curso.tipo}</TableCell>
                        <TableCell>{curso.nicho || 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(curso)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" disabled={isDeleting} onClick={() => handleDelete(curso.sigla)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">
                        Nenhum curso encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
      <AddEditCourseDialog
        isOpen={dialogOpen}
        setIsOpen={setDialogOpen}
        curso={editingCurso}
        courseTypes={courseTypes}
        onSuccess={() => {
          handleDataChanged();
          setDialogOpen(false);
        }}
      />
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente os {selectedRows.length} cursos selecionados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected} disabled={isDeleting} className={buttonVariants({ variant: "destructive" })}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

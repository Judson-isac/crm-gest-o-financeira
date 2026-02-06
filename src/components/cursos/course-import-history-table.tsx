
"use client";
import { useState, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { formatDateTime } from "@/lib/utils";
import { deleteImportAction } from "@/actions/financial-records";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Loader2 } from "lucide-react";
import type { ImportInfo } from "@/lib/types";

type CourseImportHistoryTableProps = {
  imports: ImportInfo[];
  onImportDeleted: () => void;
};

export function CourseImportHistoryTable({ imports, onImportDeleted }: CourseImportHistoryTableProps) {
  const courseImports = imports.filter(imp => imp.tipo_importacao === 'Cursos');
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDeleteClick = (importId: string) => {
    setSelectedImportId(importId);
    setDeleteDialogOpen(true);
  }

  const handleConfirmDelete = () => {
    if (!selectedImportId) return;
    startDeleteTransition(async () => {
      const result = await deleteImportAction(selectedImportId);
      if (result.success) {
        toast({ title: "Sucesso", description: "Lote de importação de cursos excluído." });
        onImportDeleted();
      } else {
        toast({ variant: "destructive", title: "Erro", description: result.message });
      }
      setDeleteDialogOpen(false);
      setSelectedImportId(null);
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Importação de Cursos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Importação</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courseImports.length > 0 ? (
                  courseImports.map(imp => (
                    <TableRow key={imp.id}>
                      <TableCell>
                        <div className="font-medium">Atualização de Cursos</div>
                        <div className="text-xs text-muted-foreground">{imp.total_registros} cursos em {formatDateTime(imp.data_importacao)}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(imp.import_id)} disabled={isDeleting}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center h-24">Nenhuma importação de cursos encontrada.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá o log desta importação de cursos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

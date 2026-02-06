
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { FinancialRecord, Filters } from "@/lib/types";
import { Trash2, Loader2 } from "lucide-react";
import { useState, useTransition, useEffect } from "react";
import { deleteFinancialRecordAction, deleteFinancialRecordsAction, deleteFinancialRecordsByFilterAction } from "@/actions/financial-records";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "../ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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

type RecordsTableProps = {
  records: FinancialRecord[];
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
  onRecordDeleted: () => void;
  filters: Filters;
};

export function RecordsTable({
  records,
  page,
  totalPages,
  totalCount,
  onPageChange,
  isLoading,
  onRecordDeleted,
  filters,
}: RecordsTableProps) {
    const { toast } = useToast();
    const [isDeleting, startDeleteTransition] = useTransition();
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<'single' | 'selected' | 'all_filtered' | null>(null);
    const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
    const [selectAllFiltered, setSelectAllFiltered] = useState(false);

    useEffect(() => {
        setSelectedRows([]);
        setSelectAllFiltered(false);
    }, [records, filters]);

    const handleDelete = (id: string) => {
        setRecordToDelete(id);
        setDeleteTarget('single');
        setDeleteConfirmOpen(true);
    };

    const handleDeleteSelectedClick = () => {
        if (selectAllFiltered) {
            setDeleteTarget('all_filtered');
        } else {
            setDeleteTarget('selected');
        }
        setDeleteConfirmOpen(true);
    }

    const handleConfirmDelete = () => {
        startDeleteTransition(async () => {
            let result;
            if (deleteTarget === 'single' && recordToDelete) {
                result = await deleteFinancialRecordAction(recordToDelete);
            } else if (deleteTarget === 'selected') {
                result = await deleteFinancialRecordsAction(selectedRows);
            } else if (deleteTarget === 'all_filtered') {
                result = await deleteFinancialRecordsByFilterAction(filters);
            } else {
                return;
            }

            if(result.success) {
                toast({ title: "Sucesso!", description: result.message });
                setSelectedRows([]);
                setSelectAllFiltered(false);
                onRecordDeleted();
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.message });
            }
            setDeleteConfirmOpen(false);
            setDeleteTarget(null);
            setRecordToDelete(null);
        });
    };

    const handleSelectAllOnPage = (checked: boolean) => {
        if (checked) {
            setSelectedRows(records.map(r => r.id));
        } else {
            setSelectedRows([]);
            setSelectAllFiltered(false);
        }
    };

    const handleSelectRow = (id: string, checked: boolean) => {
        setSelectAllFiltered(false);
        setSelectedRows(prev => checked ? [...prev, id] : prev.filter(rowId => rowId !== id));
    };

    const numSelectedOnPage = selectedRows.length;
    const numOnPage = records.length;
    const allOnPageSelected = numOnPage > 0 && numSelectedOnPage === numOnPage;
    const isIndeterminate = !selectAllFiltered && numSelectedOnPage > 0 && !allOnPageSelected;

    const numSelectedForDisplay = selectAllFiltered ? totalCount : selectedRows.length;
    const showSelectAllFilteredBanner = allOnPageSelected && !selectAllFiltered && totalCount > numOnPage;
    
    const deleteDialogDescription = () => {
        switch(deleteTarget) {
            case 'all_filtered':
                return `Esta ação não pode ser desfeita. Isso excluirá permanentemente todos os ${totalCount} registros que correspondem aos filtros atuais.`;
            case 'selected':
                return `Esta ação não pode ser desfeita. Isso excluirá permanentemente os ${selectedRows.length} registros selecionados.`;
            case 'single':
                return "Esta ação não pode ser desfeita. Isso excluirá permanentemente este registro.";
            default:
                return "";
        }
    };
    
  return (
    <>
      <Card>
        <CardHeader>
           <div className="flex justify-between items-center">
              <CardTitle>Lista de Receitas Financeiras</CardTitle>
              {numSelectedForDisplay > 0 && (
                   <Button variant="destructive" onClick={handleDeleteSelectedClick} disabled={isDeleting}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir ({numSelectedForDisplay})
                  </Button>
              )}
          </div>
        </CardHeader>
        <CardContent>
            {showSelectAllFilteredBanner && (
              <div className="bg-muted border rounded-md p-2 text-center text-sm mb-4">
                <span>Todos os {numOnPage} registros nesta página estão selecionados.</span>
                <Button variant="link" className="p-1 h-auto" onClick={() => setSelectAllFiltered(true)}>
                  Selecionar todos os {totalCount} registros
                </Button>
              </div>
            )}
            {selectAllFiltered && (
              <div className="bg-muted border rounded-md p-2 text-center text-sm mb-4">
                <span>Todos os {totalCount} registros correspondentes à busca estão selecionados.</span>
                <Button variant="link" className="p-1 h-auto" onClick={() => { setSelectedRows([]); setSelectAllFiltered(false); }}>
                  Limpar seleção
                </Button>
              </div>
            )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-12 px-4">
                     <Checkbox 
                          checked={allOnPageSelected || selectAllFiltered}
                          onCheckedChange={(checked) => handleSelectAllOnPage(checked as boolean)}
                          aria-label="Selecionar todas as linhas nesta página"
                          data-state={isIndeterminate ? 'indeterminate' : ((allOnPageSelected || selectAllFiltered) ? 'checked' : 'unchecked')}
                      />
                  </TableHead>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Polo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Curso (Sigla)</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead className="text-right">Valor Pago</TableHead>
                  <TableHead className="text-right">Valor Repasse</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead>Importado em</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                          <TableCell colSpan={12}><Skeleton className="h-5 w-full"/></TableCell>
                      </TableRow>
                  ))
                ) : records.length > 0 ? (
                  records.map((record, index) => (
                    <TableRow key={record.id} data-state={selectedRows.includes(record.id) || selectAllFiltered ? "selected" : "unselected"}>
                      <TableCell className="px-4">
                           <Checkbox 
                              checked={selectedRows.includes(record.id) || selectAllFiltered}
                              onCheckedChange={(checked) => handleSelectRow(record.id, checked as boolean)}
                              aria-label="Selecionar linha"
                          />
                      </TableCell>
                      <TableCell className="font-medium">{(page - 1) * 10 + index + 1}</TableCell>
                      <TableCell>{record.polo}</TableCell>
                      <TableCell>{record.categoria}</TableCell>
                      <TableCell>{record.tipo}</TableCell>
                      <TableCell>{record.sigla_curso}</TableCell>
                      <TableCell>{record.parcela}</TableCell>
                      <TableCell className="text-right">{formatCurrency(record.valor_pago)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(record.valor_repasse)}</TableCell>
                      <TableCell>{String(record.referencia_mes).padStart(2, '0')}/{record.referencia_ano}</TableCell>
                      <TableCell>{formatDateTime(record.data_importacao)}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(record.id)} disabled={isDeleting}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center h-24">
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        {totalPages > 0 && (
          <CardFooter>
              <Pagination>
              <PaginationContent>
                  <PaginationItem>
                  <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                      e.preventDefault();
                      if (page > 1) onPageChange(page - 1);
                      }}
                      className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
                  />
                  </PaginationItem>
                  <PaginationItem>
                  <span className="px-4 text-sm">
                      Página {page} de {totalPages}
                  </span>
                  </PaginationItem>
                  <PaginationItem>
                  <PaginationNext
                      href="#"
                      onClick={(e) => {
                      e.preventDefault();
                      if (page < totalPages) onPageChange(page + 1);
                      }}
                      className={page >= totalPages ? "pointer-events-none opacity-50" : undefined}
                  />
                  </PaginationItem>
              </PaginationContent>
              </Pagination>
          </CardFooter>
        )}
      </Card>
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteDialogDescription()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting} className={buttonVariants({ variant: "destructive" })}>
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Exclusão
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
  </>
  );
}

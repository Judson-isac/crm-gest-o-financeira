
"use client";

import { useState, useTransition } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import type { ImportInfo } from "@/lib/types";
import { Trash2, Loader2, FileUp, SpellCheck, AlertTriangle, CheckCircle } from "lucide-react";
import { deleteImportAction, validateImportedCoursesAction } from "@/actions/financial-records";
import { useToast } from "@/hooks/use-toast";
import { ClientOnly } from "../client-only";

type ImportsTableProps = {
  imports: ImportInfo[];
  onImportDeleted: () => void;
};

export function ImportsTable({ imports, onImportDeleted }: ImportsTableProps) {
    const { toast } = useToast();
    const [isDeleting, startDeleteTransition] = useTransition();
    const [isValidating, startValidationTransition] = useTransition();
    
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedImportId, setSelectedImportId] = useState<string | null>(null);

    const [validationResult, setValidationResult] = useState<{ untranslated: string[]; importName: string; } | null>(null);
    const [validationDialogOpen, setValidationDialogOpen] = useState(false);

    const financialImports = imports.filter(imp => imp.tipo_importacao !== 'Cursos');

    const handleDeleteClick = (importId: string) => {
        setSelectedImportId(importId);
        setDeleteDialogOpen(true);
    }

    const handleConfirmDelete = () => {
        if (!selectedImportId) return;

        startDeleteTransition(async () => {
            const result = await deleteImportAction(selectedImportId);
            if(result.success) {
                toast({ title: "Sucesso", description: "Lote de importação excluído."});
                onImportDeleted();
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.message});
            }
            setDeleteDialogOpen(false);
            setSelectedImportId(null);
        });
    }

    const handleValidateClick = (imp: ImportInfo) => {
        if (imp.tipo_importacao === 'Cursos') return;

        startValidationTransition(async () => {
            const result = await validateImportedCoursesAction(imp.import_id);
            if(result.success) {
                setValidationResult({
                    untranslated: result.untranslated,
                    importName: getImportDisplayName(imp),
                });
                setValidationDialogOpen(true);
            } else {
                toast({ variant: "destructive", title: "Erro na Validação", description: result.message });
            }
        });
    }

    const getImportDisplayName = (imp: ImportInfo) => {
        if (imp.tipo_importacao === 'Cursos') {
            return `Atualização de Cursos`;
        }
        const monthName = imp.referencia_mes ? new Date(imp.referencia_ano || 2000, imp.referencia_mes - 1)
            .toLocaleString('pt-BR', { month: 'long' }) : '';
        const formattedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        const importTypeDisplay = imp.tipo_importacao === 'NEAD' ? 'Portal NEAD' : `Arquivo (${imp.nome_arquivo})`;
        return `${formattedMonth}/${imp.referencia_ano} - ${importTypeDisplay}`;
    };

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
            <FileUp className="h-4 w-4" />
            Histórico de Importações
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto max-h-72">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0">
              <TableRow>
                <TableHead>Importação</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {financialImports.length > 0 ? (
                financialImports.map((imp) => (
                  <TableRow key={imp.id}>
                    <TableCell>
                        <div className="font-medium">{getImportDisplayName(imp)}</div>
                        <ClientOnly>
                          <div className="text-xs text-muted-foreground">{imp.total_registros} registros em {formatDateTime(imp.data_importacao)}</div>
                        </ClientOnly>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleValidateClick(imp)}
                        disabled={isValidating || imp.tipo_importacao === 'Cursos'}
                        title="Validar siglas dos cursos"
                      >
                        {isValidating && selectedImportId === imp.import_id ? <Loader2 className="h-4 w-4 animate-spin"/> : <SpellCheck className="h-4 w-4 text-blue-500" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(imp.import_id)} disabled={isDeleting}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-center h-24">
                    Nenhuma importação ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá permanentemente todos os {imports.find(i => i.import_id === selectedImportId)?.total_registros || ''} registros associados a esta importação.
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
      </CardContent>
    </Card>

    <AlertDialog open={validationDialogOpen} onOpenChange={setValidationDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Resultado da Validação de Cursos</AlertDialogTitle>
                <AlertDialogDescription>
                    Resultado da verificação de siglas para a importação: <span className="font-semibold">{validationResult?.importName}</span>.
                </AlertDialogDescription>
            </AlertDialogHeader>
            {validationResult && validationResult.untranslated.length > 0 ? (
                 <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{validationResult.untranslated.length} Siglas Não Encontradas!</AlertTitle>
                    <AlertDescription>
                        <p className="mb-2">As seguintes siglas de cursos não foram encontradas no banco de dados. Considere atualizar a lista de cursos.</p>
                        <ul className="list-disc pl-5 text-xs font-mono">
                            {validationResult.untranslated.map(sigla => <li key={sigla}>{sigla}</li>)}
                        </ul>
                    </AlertDescription>
                </Alert>
            ) : (
                <Alert variant="default" className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">Tudo Certo!</AlertTitle>
                    <AlertDescription className="text-green-700">
                        Todas as siglas de cursos nesta importação foram encontradas no banco de dados.
                    </AlertDescription>
                </Alert>
            )}
            <AlertDialogFooter>
                <AlertDialogAction onClick={() => setValidationDialogOpen(false)}>Fechar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

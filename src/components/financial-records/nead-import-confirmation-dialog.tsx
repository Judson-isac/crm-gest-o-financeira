"use client";

import { useTransition } from "react";
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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileJson, Clipboard, AlertTriangle } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import type { FinancialRecord } from "@/lib/types";

type ExtractedDataState = {
  records: Omit<FinancialRecord, 'id' | 'data_importacao'>[];
  errors: string[];
} | null;

type NeadImportConfirmationDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  extractedData: ExtractedDataState;
  onConfirm: () => Promise<void>;
  isImporting: boolean;
};

export function NeadImportConfirmationDialog({
  isOpen,
  onOpenChange,
  extractedData,
  onConfirm,
  isImporting,
}: NeadImportConfirmationDialogProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    if (!extractedData) return;
    navigator.clipboard.writeText(JSON.stringify(extractedData.records, null, 2)).then(() => {
        toast({
            title: "Copiado!",
            description: "Os dados JSON extraídos foram copiados."
        });
    }).catch(err => {
         toast({
            variant: "destructive",
            title: "Falha ao copiar",
            description: "Não foi possível copiar os dados."
        });
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-4xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <FileJson className="text-primary"/>
            Confirmar Importação de Dados
          </AlertDialogTitle>
          <AlertDialogDescription>
            {`Foram encontrados ${extractedData?.records.length || 0} registros no relatório. Revise os dados abaixo antes de confirmar a importação.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
         {extractedData && extractedData.errors.length > 0 && (
           <Alert variant="destructive" className="my-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Ocorreram Avisos na Extração</AlertTitle>
              <AlertDescription>
                  <ul className="list-disc pl-5">
                    {extractedData.errors.map((error, index) => <li key={index}>{error}</li>)}
                  </ul>
              </AlertDescription>
          </Alert>
        )}
        <div className="relative mt-4 max-h-96">
            <ScrollArea className="h-96 w-full rounded-md border p-4 bg-muted">
                <pre className="text-xs break-all whitespace-pre-wrap">
                    {JSON.stringify(extractedData?.records, null, 2)}
                </pre>
            </ScrollArea>
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={handleCopy}
            >
                <Clipboard className="h-4 w-4" />
            </Button>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isImporting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isImporting || !extractedData || extractedData.records.length === 0}>
            {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isImporting ? "Importando..." : "Confirmar Importação"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

    
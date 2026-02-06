
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, FileSpreadsheet, Loader2, FileJson, Clipboard, AlertTriangle } from "lucide-react";
import { Textarea } from "../ui/textarea";
import { parseAndTransformHtml } from "@/lib/html-parser";
import type { FinancialRecord } from "@/lib/types";

export function ImportDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [extractedData, setExtractedData] = useState<{ records: Omit<FinancialRecord, 'id' | 'data_importacao'>[], errors: string[] } | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleCopy = () => {
    if (!extractedData) return;
    navigator.clipboard.writeText(JSON.stringify(extractedData.records, null, 2)).then(() => {
        toast({
            title: "Copiado!",
            description: "Os dados extraídos foram copiados."
        });
    }).catch(err => {
         toast({
            variant: "destructive",
            title: "Falha ao copiar",
            description: "Não foi possível copiar os dados."
        });
    });
  };

  const handleSubmit = async () => {
    if (!file) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Por favor, selecione um arquivo.",
      });
      return;
    }

    startTransition(async () => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const decoder = new TextDecoder('windows-1252');
            const fileContent = decoder.decode(arrayBuffer);
            
            const result = parseAndTransformHtml(fileContent, file.name, (log) => console.log(`[XLS Import]: ${log}`));
            setExtractedData(result);
            setResultDialogOpen(true);
            setOpen(false);

        } catch (e: any) {
            console.error("Erro na leitura do arquivo: ", e);
            toast({
                variant: "destructive",
                title: "Erro na Leitura do Arquivo",
                description: `Ocorreu um erro ao ler o arquivo: ${e.message}`,
            });
        }
    });
  };

  const handleConfirmImport = () => {
      if (!extractedData || extractedData.records.length === 0) {
          toast({
              variant: "destructive",
              title: "Nenhum dado para importar",
              description: "A extração não encontrou registros válidos no arquivo."
          });
          return;
      }
      startTransition(async () => {
          const response = await fetch('/api/import-records', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(extractedData.records),
          });
          const result = await response.json();

          if (result.success) {
              toast({ title: "Importação Concluída!", description: result.message });
              router.refresh();
          } else {
              toast({ variant: "destructive", title: "Falha na Importação", description: result.message });
          }
          setResultDialogOpen(false);
      });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          setFile(null);
        }
      }}>
        <DialogTrigger asChild>
          <Button>
            <UploadCloud className="mr-2 h-4 w-4" /> Importar XLS
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Importar Relatório</DialogTitle>
            <DialogDescription>
              Faça o upload de um arquivo .xls para extrair e importar os dados.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="file">Arquivo</Label>
              <Input id="file" type="file" onChange={handleFileChange} accept=".xls,.html" />
            </div>
            {file && (
              <div className="flex items-center text-sm text-muted-foreground p-2 bg-muted rounded-md">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  <span>{file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleSubmit} disabled={isPending || !file}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Analisando..." : "Analisar Arquivo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <AlertDialogContent className="max-w-4xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileJson className="text-primary"/>
              Dados Extraídos do Arquivo
            </AlertDialogTitle>
            <AlertDialogDescription>
              {`Foram encontrados ${extractedData?.records.length || 0} registros. Revise os dados abaixo antes de confirmar a importação.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
           {extractedData && extractedData.errors.length > 0 && (
             <Alert variant="destructive" className="my-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Ocorreram Avisos na Extração</AlertTitle>
                <AlertDescription>
                    <ul>{extractedData.errors.map((error, index) => <li key={index}>- {error}</li>)}</ul>
                </AlertDescription>
            </Alert>
          )}
          <div className="relative mt-4 bg-muted p-4 rounded-md border max-h-96 overflow-auto">
              <Textarea
                  readOnly
                  value={JSON.stringify(extractedData?.records, null, 2)}
                  className="w-full h-96 font-mono text-xs bg-background"
                  rows={25}
              />
              <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-5 right-5"
                  onClick={handleCopy}
              >
                  <Clipboard className="h-4 w-4" />
              </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmImport} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Importação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

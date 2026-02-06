
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

type NeadImportDebuggerProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  logs: string[];
  isProcessing: boolean;
};

export function NeadImportDebugger({ isOpen, onOpenChange, logs, isProcessing }: NeadImportDebuggerProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Depurador de Importação NEAD</DialogTitle>
          <DialogDescription>
            Acompanhe o processo de análise do relatório em tempo real.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-80 w-full rounded-md border p-4">
          <pre className="text-xs">
            {logs.map((log, index) => (
              <div key={index} className={`whitespace-pre-wrap ${log.includes('ERRO') ? 'text-destructive' : ''} ${log.includes('SUCESSO') ? 'text-green-500' : ''} ${log.includes('AVISO') ? 'text-yellow-500' : ''}`}>
                {log}
              </div>
            ))}
             {isProcessing && <Loader2 className="h-4 w-4 animate-spin mt-2" />}
          </pre>
        </ScrollArea>
        <DialogFooter>
          {isProcessing ? (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando... Por favor, aguarde.
            </div>
          ) : (
             <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, PlusCircle } from "lucide-react";
import { getDespesasDetalhadas, getCursos } from "@/lib/api";
import { addDespesaAction, deleteDespesaAction } from "@/actions/financial-records";
import { ScrollArea } from "../ui/scroll-area";
import { Combobox } from "../ui/combobox";
import { formatCurrency } from "@/lib/utils";
import type { Despesa, Polo, Curso } from "@/lib/types";

type DespesasDetalheDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  polo: Polo | null;
  ano: number | undefined;
  mes: number | undefined;
  onDataChanged: () => void;
};

export function DespesasDetalheDialog({ open, onOpenChange, polo, ano, mes, onDataChanged }: DespesasDetalheDialogProps) {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [isDataLoading, startDataLoading] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [isDeleting, startDeleting] = useTransition();
  
  const [newTipoDespesa, setNewTipoDespesa] = useState<'GERAL' | 'EAD' | 'HIBRIDO'>('GERAL');
  const [newDescricao, setNewDescricao] = useState("");
  const [newValor, setNewValor] = useState("");
  const [newCurso, setNewCurso] = useState("");

  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      // Fetch despesas e cursos
      startDataLoading(async () => {
        if (polo && ano && mes) {
          const [despesasData, cursosData] = await Promise.all([
            getDespesasDetalhadas({ polo, ano, mes }),
            getCursos()
          ]);
          setDespesas(despesasData);
          setCursos(cursosData);
        }
      });
    } else {
        // Reset state on close
        setDespesas([]);
        setCursos([]);
        setNewTipoDespesa('GERAL');
        setNewDescricao('');
        setNewValor('');
        setNewCurso('');
    }
  }, [open, polo, ano, mes]);

  const cursoOptions = useMemo(() => {
    return cursos
      .filter(c => newTipoDespesa === 'GERAL' || c.metodologia === newTipoDespesa)
      .map(c => ({ value: c.sigla, label: `${c.nome} (${c.sigla})` }));
  }, [cursos, newTipoDespesa]);

  
  const handleAddDespesa = async (e: React.FormEvent) => {
    e.preventDefault();
    let descricaoFinal = newDescricao;
    let siglaCursoFinal = newCurso !== "" ? newCurso : undefined;

    if (newTipoDespesa !== 'GERAL') {
        const cursoSelecionado = cursos.find(c => c.sigla === newCurso);
        if (!cursoSelecionado) {
            toast({ variant: "destructive", title: "Erro de Validação", description: "Por favor, selecione um curso válido." });
            return;
        }
        descricaoFinal = cursoSelecionado.nome;
    }
    
    if (!polo || !ano || !mes) return;

    startSaving(async () => {
        const result = await addDespesaAction({
            polo,
            ano,
            mes,
            tipo_despesa: newTipoDespesa,
            sigla_curso: siglaCursoFinal,
            descricao: descricaoFinal,
            valor: parseFloat(newValor || '0'),
        });

        if (result.success && result.data) {
            setDespesas(current => [...current, result.data!]);
            setNewDescricao("");
            setNewValor("");
            setNewCurso("");
            onDataChanged(); // Refresh the aggregate view
            toast({ title: "Sucesso", description: "Despesa adicionada." });
        } else {
            toast({ variant: "destructive", title: "Erro ao adicionar", description: result.message });
        }
    });
  }

  const handleDeleteDespesa = (id: string) => {
      startDeleting(async () => {
          const result = await deleteDespesaAction(id);
          if (result.success) {
              setDespesas(current => current.filter(d => d.id !== id));
              onDataChanged();
              toast({ title: "Sucesso", description: "Despesa removida." });
          } else {
              toast({ variant: "destructive", title: "Erro ao remover", description: result.message });
          }
      });
  }

  if (!polo || !ano || !mes) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Despesas - {polo}</DialogTitle>
          <DialogDescription>
            Adicione ou remova despesas detalhadas para o período de {String(mes).padStart(2, '0')}/{ano}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mt-4">
            <div className="flex flex-col gap-4">
                <h3 className="font-semibold text-lg border-b pb-2">Nova Despesa</h3>
                <form onSubmit={handleAddDespesa} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="tipo-despesa">Tipo de Despesa</Label>
                        <Select value={newTipoDespesa} onValueChange={(value: 'GERAL' | 'EAD' | 'HIBRIDO') => {
                            setNewTipoDespesa(value);
                            setNewCurso('');
                            setNewDescricao('');
                        }}>
                            <SelectTrigger id="tipo-despesa"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="GERAL">Geral (Aluguel, Luz, etc.)</SelectItem>
                                <SelectItem value="EAD">Curso EAD</SelectItem>
                                <SelectItem value="HIBRIDO">Curso Híbrido</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {newTipoDespesa === 'GERAL' ? (
                         <div className="space-y-2">
                            <Label htmlFor="descricao-geral">Descrição</Label>
                            <Input id="descricao-geral" value={newDescricao} onChange={e => setNewDescricao(e.target.value)} placeholder="Ex: Aluguel do Mês" required />
                        </div>
                    ) : (
                        <div className="space-y-2">
                             <Label htmlFor="curso">Curso</Label>
                             <Combobox
                                options={cursoOptions}
                                value={newCurso}
                                onValueChange={setNewCurso}
                                placeholder="Selecione um curso..."
                                emptyText="Nenhum curso encontrado."
                             />
                        </div>
                    )}
                   
                    <div className="space-y-2">
                        <Label htmlFor="valor">Valor (R$)</Label>
                        <Input id="valor" type="number" value={newValor} onChange={e => setNewValor(e.target.value)} placeholder="1500.00" step="0.01" required />
                    </div>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>}
                        Adicionar Despesa
                    </Button>
                </form>
            </div>
             <div>
                <h3 className="font-semibold text-lg border-b pb-2 mb-4">Despesas Lançadas</h3>
                <ScrollArea className="h-80 w-full rounded-md border">
                    {isDataLoading ? <div className="flex items-center justify-center h-full"> <Loader2 className="h-6 w-6 animate-spin"/></div> :
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Descrição</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead className="text-center">Ação</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {despesas.length > 0 ? (
                            despesas.map(d => (
                                <TableRow key={d.id}>
                                    <TableCell>{d.descricao}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{d.tipo_despesa}</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(d.valor)}</TableCell>
                                    <TableCell className="text-center">
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteDespesa(d.id)} disabled={isDeleting}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={4} className="text-center h-24">Nenhuma despesa lançada.</TableCell></TableRow>
                        )}
                        </TableBody>
                    </Table>
                    }
                </ScrollArea>
             </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

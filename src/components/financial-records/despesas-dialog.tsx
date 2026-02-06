"use client";

import { useState, useTransition, useEffect } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Coins, Loader2, ListPlus } from "lucide-react";
import { getDistinctValues, getDespesasParaTabela } from "@/lib/api";
import { upsertDespesaAction } from "@/actions/financial-records";
import { ScrollArea } from "../ui/scroll-area";


type DespesaItem = {
    polo: string;
    valor: number;
}

export function DespesasDialog() {
  const [open, setOpen] = useState(false);
  const [isDataLoading, startDataLoading] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const { toast } = useToast();
  
  const [anos, setAnos] = useState<number[]>([]);
  const [selectedAno, setSelectedAno] = useState<number | undefined>();
  const [selectedMes, setSelectedMes] = useState<number | undefined>();
  const [despesas, setDespesas] = useState<DespesaItem[]>([]);
  
  useEffect(() => {
    async function fetchAnos() {
      const { anos: distinctAnos } = await getDistinctValues();
      setAnos(distinctAnos);
      if (distinctAnos.length > 0) {
        setSelectedAno(distinctAnos[0]);
      }
    }
    fetchAnos();
  }, []);

  useEffect(() => {
    if (selectedAno && selectedMes) {
      startDataLoading(async () => {
        const data = await getDespesasParaTabela({ ano: selectedAno, mes: selectedMes });
        setDespesas(data);
      });
    } else {
        setDespesas([]);
    }
  }, [selectedAno, selectedMes]);

  const handleInputChange = (polo: string, valor: string) => {
    const numericValue = parseFloat(valor) || 0;
    setDespesas(current => current.map(d => d.polo === polo ? { ...d, valor: numericValue } : d));
  };
  
  const handleSave = () => {
    if (!selectedAno || !selectedMes) {
        toast({
            variant: "destructive",
            title: "Seleção incompleta",
            description: "Por favor, selecione ano e mês.",
        });
        return;
    }

    startSaving(async () => {
        const promises = despesas.map(d => upsertDespesaAction(d.polo, selectedAno, selectedMes, d.valor));
        await Promise.all(promises);
        toast({ title: "Sucesso", description: "Despesas salvas com sucesso." });
        setOpen(false);
    });
  };
  
  const meses = Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), name: new Date(2000, i).toLocaleString('pt-BR', { month: 'long' }) }));

  return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Coins className="mr-2 h-4 w-4" /> Lançar Despesas
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lançamento de Despesas Mensais</DialogTitle>
            <DialogDescription>
              Selecione o período e insira o valor total das despesas para cada polo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="ano-despesa">Ano</Label>
                <Select value={selectedAno?.toString()} onValueChange={(v) => setSelectedAno(parseInt(v))}>
                    <SelectTrigger id="ano-despesa"><SelectValue placeholder="Selecione o Ano" /></SelectTrigger>
                    <SelectContent>
                    {anos.map(a => <SelectItem key={a} value={a.toString()}>{a}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="mes-despesa">Mês</Label>
                <Select value={selectedMes?.toString()} onValueChange={(v) => setSelectedMes(parseInt(v))}>
                    <SelectTrigger id="mes-despesa"><SelectValue placeholder="Selecione o Mês" /></SelectTrigger>
                    <SelectContent>
                    {meses.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.name.charAt(0).toUpperCase() + m.name.slice(1)}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
          </div>
          <ScrollArea className="h-72 w-full rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Polo</TableHead>
                        <TableHead className="w-[200px] text-right">Valor da Despesa (R$)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isDataLoading ? (
                        <TableRow><TableCell colSpan={2} className="text-center h-24">Carregando...</TableCell></TableRow>
                    ) : despesas.length > 0 ? (
                        despesas.map(item => (
                            <TableRow key={item.polo}>
                                <TableCell className="font-medium">{item.polo}</TableCell>
                                <TableCell>
                                    <Input
                                        type="number"
                                        className="text-right"
                                        value={item.valor}
                                        onChange={(e) => handleInputChange(item.polo, e.target.value)}
                                        step="0.01"
                                    />
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow><TableCell colSpan={2} className="text-center h-24">Selecione um período para ver os polos.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
          </ScrollArea>
          <DialogFooter>
            <Button type="button" onClick={handleSave} disabled={isSaving || isDataLoading || despesas.length === 0}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? "Salvando..." : "Salvar Despesas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}

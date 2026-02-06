
"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings } from "lucide-react";
import { getDistinctValues, getDespesasAgrupadasPorPolo } from "@/lib/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Polo } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type DespesaAgrupada = {
  polo: string;
  total: number;
}

export default function DespesasPage() {
  const [isDataLoading, startDataLoading] = useTransition();
  const { toast } = useToast();
  
  const [anos, setAnos] = useState<number[]>([]);
  const [selectedAno, setSelectedAno] = useState<number>(new Date().getFullYear());
  const [selectedMes, setSelectedMes] = useState<number>(new Date().getMonth() + 1);
  const [despesasAgrupadas, setDespesasAgrupadas] = useState<DespesaAgrupada[]>([]);
  
  const fetchData = useCallback(() => {
    if (selectedAno && selectedMes) {
      startDataLoading(async () => {
        const data = await getDespesasAgrupadasPorPolo({ ano: selectedAno, mes: selectedMes });
        setDespesasAgrupadas(data);
      });
    }
  }, [selectedAno, selectedMes]);

  useEffect(() => {
    async function fetchAnos() {
      const { anos: distinctAnos } = await getDistinctValues();
      const currentYear = new Date().getFullYear();
      const allYears = [...new Set([currentYear, ...distinctAnos])].sort((a,b) => b-a);
      setAnos(allYears);
    }
    fetchAnos();
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const meses = Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), name: new Date(2000, i).toLocaleString('pt-BR', { month: 'long' }) }));

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Lançamento de Despesas Mensais</CardTitle>
          <CardDescription>
            Selecione o período, depois clique em &quot;Gerenciar&quot; em um polo para adicionar despesas detalhadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
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
          <ScrollArea className="h-96 w-full rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Polo</TableHead>
                        <TableHead className="text-right">Despesa Total</TableHead>
                        <TableHead className="text-center w-[150px]">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isDataLoading ? (
                        <TableRow><TableCell colSpan={3} className="text-center h-24 p-4"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : despesasAgrupadas.length > 0 ? (
                        despesasAgrupadas.map(item => (
                            <TableRow key={item.polo}>
                                <TableCell className="font-medium">{item.polo}</TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(item.total)}</TableCell>
                                <TableCell className="text-center">
                                    <Button asChild variant="outline" size="sm">
                                      <Link href={`/despesas/${encodeURIComponent(item.polo)}?ano=${selectedAno}&mes=${selectedMes}`}>
                                          <Settings className="mr-2 h-4 w-4" />
                                          Gerenciar
                                      </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow><TableCell colSpan={3} className="text-center h-24">Nenhum polo com dados no período.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  );
}

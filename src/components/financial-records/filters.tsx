"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Filters } from "@/lib/types";
import { Filter, X } from "lucide-react";

type FilterControlsProps = {
  onFilter: (filters: Filters) => void;
  onClear: () => void;
  distinctValues: { polos: string[]; categorias: string[]; anos: number[] };
  isPending: boolean;
};

export function FilterControls({
  onFilter,
  onClear,
  distinctValues,
  isPending,
}: FilterControlsProps) {
  const [polo, setPolo] = useState<string | undefined>();
  const [categoria, setCategoria] = useState<string | undefined>();
  const [mes, setMes] = useState<number | undefined>();
  const [ano, setAno] = useState<number | undefined>();

  const handleFilterClick = () => {
    onFilter({ polo, categoria, mes, ano });
  };

  const handleClearClick = () => {
    setPolo(undefined);
    setCategoria(undefined);
    setMes(undefined);
    setAno(undefined);
    onClear();
  };
  
  const meses = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, name: new Date(0, i).toLocaleString('pt-BR', { month: 'long' }) }));

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
          <Select value={polo} onValueChange={setPolo}>
            <SelectTrigger><SelectValue placeholder="Polo" /></SelectTrigger>
            <SelectContent>
              {distinctValues.polos.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              {distinctValues.categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={mes?.toString()} onValueChange={v => setMes(parseInt(v))}>
            <SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger>
            <SelectContent>
              {meses.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={ano?.toString()} onValueChange={v => setAno(parseInt(v))}>
            <SelectTrigger><SelectValue placeholder="Ano" /></SelectTrigger>
            <SelectContent>
              {distinctValues.anos.map(a => <SelectItem key={a} value={a.toString()}>{a}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="flex flex-col col-span-1 space-y-2 lg:col-span-2 lg:flex-row lg:space-y-0 lg:space-x-2">
            <Button onClick={handleFilterClick} disabled={isPending} className="w-full">
              <Filter />
              {isPending ? "Filtrando..." : "Filtrar"}
            </Button>
            <Button onClick={handleClearClick} variant="outline" disabled={isPending} className="w-full">
              <X />
              Limpar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

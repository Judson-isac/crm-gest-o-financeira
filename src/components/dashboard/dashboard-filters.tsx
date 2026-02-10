'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, X, Loader2 } from 'lucide-react';
import { MultiSelect } from '../ui/multi-select';

type DashboardFilterControlsProps = {
  distinctValues: { polos: string[]; anos: number[]; processos?: any[] };
  showProcessoSeletivo?: boolean;
  actions?: React.ReactNode;
};

export function DashboardFilterControls({ distinctValues, showProcessoSeletivo, actions }: DashboardFilterControlsProps) {
  // Re-run deployment
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [polos, setPolos] = useState<string[]>(searchParams.get('polo')?.split(',') || []);
  const [ano, setAno] = useState(searchParams.get('ano') || 'all');
  const [mes, setMes] = useState(searchParams.get('mes') || 'all');
  const [processo, setProcesso] = useState(searchParams.get('processo') || 'all');
  const [modo, setModo] = useState(searchParams.get('modo') || 'repasse');

  const handleFilterClick = () => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (polos.length > 0) params.set('polo', polos.join(','));
      if (ano && ano !== 'all') params.set('ano', ano);
      if (mes && mes !== 'all') params.set('mes', mes);
      if (processo && processo !== 'all') params.set('processo', processo);
      if (modo) params.set('modo', modo);
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleClearClick = () => {
    startTransition(() => {
      router.push(pathname);
      setPolos([]);
      setAno('all');
      setMes('all');
      setProcesso('all');
      setModo('repasse');
    });
  };

  const meses = Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), name: new Date(2000, i).toLocaleString('pt-BR', { month: 'long' }) }));

  const polosSafe = distinctValues?.polos || [];
  const anosSafe = distinctValues?.anos || [];
  const processosSafe = distinctValues?.processos || [];

  const poloOptions = polosSafe.map(p => ({ label: p, value: p }));

  return (
    <Card>
      {actions && (
        <CardHeader className="flex flex-row items-center justify-end space-y-0 p-4 pb-0">
          {actions}
        </CardHeader>
      )}
      <CardContent className="p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <MultiSelect
            options={poloOptions}
            onValueChange={setPolos}
            defaultValue={polos}
            placeholder="Todos os Polos"
            className="w-full"
            disabled={isPending}
          />

          <Select value={ano} onValueChange={setAno} disabled={isPending}>
            <SelectTrigger><SelectValue placeholder="Todos os Anos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Anos</SelectItem>
              {anosSafe.map(a => <SelectItem key={a} value={a.toString()}>{a}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={mes} onValueChange={setMes} disabled={isPending}>
            <SelectTrigger><SelectValue placeholder="Todos os Meses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Meses</SelectItem>
              {meses.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.name.charAt(0).toUpperCase() + m.name.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>

          {showProcessoSeletivo && processosSafe.length > 0 && (
            <Select value={processo} onValueChange={setProcesso} disabled={isPending}>
              <SelectTrigger><SelectValue placeholder="Todos os Processos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Processos</SelectItem>
                {processosSafe.map(p => (
                  <SelectItem key={p.id || p} value={p.id || p}>
                    {p.nome ? p.nome : (p.numero && p.ano ? `${p.numero}/${p.ano}` : (p.numero || p))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={modo} onValueChange={setModo} disabled={isPending}>
            <SelectTrigger><SelectValue placeholder="Métrica" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pago">Valor Total (Pago)</SelectItem>
              <SelectItem value="repasse">Valor Líquido (Repasse)</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex flex-col col-span-1 md:col-span-2 space-y-2 lg:flex-row lg:space-y-0 lg:space-x-2">
            <Button onClick={handleFilterClick} disabled={isPending} className="w-full">
              {isPending ? <Loader2 className="animate-spin" /> : <Filter />}
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

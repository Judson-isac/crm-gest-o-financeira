

'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
};

// ... inside component ...

{
  showProcessoSeletivo && distinctValues.processos && (
    <Select value={processo} onValueChange={setProcesso} disabled={isPending}>
      <SelectTrigger><SelectValue placeholder="Todos os Processos" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os Processos</SelectItem>
        {distinctValues.processos.map(p => (
          <SelectItem key={p.id || p} value={p.id || p}>
            {p.numero || p}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

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
        </div >
      </CardContent >
    </Card >
  );
}


"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import type { SummaryData } from "@/lib/types";
import { BarChart, DollarSign, Hash, Handshake, Tag, Wrench, Users } from 'lucide-react';

type SummaryCardsProps = {
  summary: SummaryData;
  isLoading: boolean;
};

const StatCard = ({ title, value, icon: Icon, isLoading }: { title: string; value: string | number; icon: React.ElementType, isLoading: boolean }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-8 w-3/4" />
      ) : (
        <div className="text-2xl font-bold">{value}</div>
      )}
    </CardContent>
  </Card>
);

export function SummaryCards({ summary, isLoading }: SummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard title="Total de Registros" value={summary.totalRecords.toLocaleString('pt-BR')} icon={Hash} isLoading={isLoading} />
      <StatCard title="Receita Gerada" value={formatCurrency(summary.totalReceita)} icon={DollarSign} isLoading={isLoading} />
      <StatCard title="Total do Repasse" value={formatCurrency(summary.totalRepasse)} icon={Handshake} isLoading={isLoading} />
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            Resumo por Tipo
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center"><Users className="w-4 h-4 mr-2"/><span>Mensalidade:</span> <span>{summary.tipoCounts.Mensalidade}</span></div>
              <div className="flex justify-between items-center"><Handshake className="w-4 h-4 mr-2"/><span>Acordo:</span> <span>{summary.tipoCounts.Acordo}</span></div>
              <div className="flex justify-between items-center"><Wrench className="w-4 h-4 mr-2"/><span>Serviço:</span> <span>{summary.tipoCounts.Serviço}</span></div>
              <div className="flex justify-between items-center"><Tag className="w-4 h-4 mr-2"/><span>Descontos:</span> <span>{summary.tipoCounts.Descontos}</span></div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

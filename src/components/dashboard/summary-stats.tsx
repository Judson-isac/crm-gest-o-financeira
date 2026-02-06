
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import type { SummaryData } from "@/lib/types";
import { BarChart, DollarSign, Hash, Handshake, Tag, Wrench, Users, ArrowDown, ArrowUp } from 'lucide-react';

type SummaryStatsProps = {
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

const GrowthStatCard = ({ title, value, isLoading }: { title: string, value?: number, isLoading: boolean }) => {
  const isPositive = value !== undefined && value >= 0;
  const displayValue = value !== undefined ? `${value.toFixed(1)}%` : 'N/A';
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {value !== undefined && (
          isPositive ? <ArrowUp className="h-4 w-4 text-green-500" /> : <ArrowDown className="h-4 w-4 text-destructive" />
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-3/4" />
        ) : (
          <div className={`text-2xl font-bold ${value === undefined ? '' : isPositive ? 'text-green-500' : 'text-destructive'}`}>
            {displayValue}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SummaryStats({ summary, isLoading }: SummaryStatsProps) {
    const safeSummary = summary || {
        totalRecords: 0,
        totalReceita: 0,
        totalRepasse: 0,
        tipoCounts: { Mensalidade: 0, Acordo: 0, Serviço: 0, Descontos: 0 },
        monthlyGrowth: undefined,
    };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <StatCard title="Total de Registros" value={safeSummary.totalRecords.toLocaleString('pt-BR')} icon={Hash} isLoading={isLoading} />
      <StatCard title="Receita Gerada" value={formatCurrency(safeSummary.totalReceita)} icon={DollarSign} isLoading={isLoading} />
      <StatCard title="Total do Repasse" value={formatCurrency(safeSummary.totalRepasse)} icon={Handshake} isLoading={isLoading} />
      <GrowthStatCard title="Crescimento (vs. Período Ant.)" value={safeSummary.monthlyGrowth} isLoading={isLoading} />
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
              <div className="flex justify-between items-center"><Users className="w-4 h-4 mr-2"/><span>Mensalidade:</span> <span>{safeSummary.tipoCounts.Mensalidade || 0}</span></div>
              <div className="flex justify-between items-center"><Handshake className="w-4 h-4 mr-2"/><span>Acordo:</span> <span>{safeSummary.tipoCounts.Acordo || 0}</span></div>
              <div className="flex justify-between items-center"><Wrench className="w-4 h-4 mr-2"/><span>Serviço:</span> <span>{safeSummary.tipoCounts.Serviço || 0}</span></div>
              <div className="flex justify-between items-center"><Tag className="w-4 h-4 mr-2"/><span>Descontos:</span> <span>{safeSummary.tipoCounts.Descontos || 0}</span></div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

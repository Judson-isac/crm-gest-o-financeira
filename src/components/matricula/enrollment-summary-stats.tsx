
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserPlus, UserMinus, BarChart, ArrowUp, ArrowDown, GraduationCap, School } from 'lucide-react';
import type { EnrollmentSummaryData } from "@/lib/api";

type EnrollmentSummaryStatsProps = {
    summary: EnrollmentSummaryData;
    isLoading: boolean;
};

const StatCard = ({ title, value, icon: Icon, isLoading, colorClass }: { title: string; value: string | number; icon: React.ElementType, isLoading: boolean, colorClass?: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className={`h-4 w-4 text-muted-foreground ${colorClass || ''}`} />
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

export function EnrollmentSummaryStats({ summary, isLoading }: EnrollmentSummaryStatsProps) {
    const safeSummary = summary || {
        totalMatriculas: 0,
        ativas: 0,
        novasMes: 0,
        canceladas: 0,
        monthlyGrowth: undefined,
    };

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
                title="Total de Matrículas (Filtro)"
                value={safeSummary.totalMatriculas.toLocaleString('pt-BR')}
                icon={GraduationCap}
                isLoading={isLoading}
            />
            <StatCard
                title="Matrículas Ativas"
                value={safeSummary.ativas.toLocaleString('pt-BR')}
                icon={School}
                isLoading={isLoading}
                colorClass="text-blue-500"
            />
            <StatCard
                title="Novas (Período)"
                value={safeSummary.novasMes.toLocaleString('pt-BR')}
                icon={UserPlus}
                isLoading={isLoading}
                colorClass="text-green-500"
            />
            <StatCard
                title="Canceladas/Evadidas"
                value={safeSummary.canceladas.toLocaleString('pt-BR')}
                icon={UserMinus}
                isLoading={isLoading}
                colorClass="text-red-500"
            />
            {/* 
      <GrowthStatCard title="Crescimento (vs. Mês Ant.)" value={safeSummary.monthlyGrowth} isLoading={isLoading} />
       */}
        </div>
    );
}

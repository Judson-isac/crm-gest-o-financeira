
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, List } from 'lucide-react';
import Link from 'next/link';
import { DashboardFilterControls } from '@/components/dashboard/dashboard-filters';
import { EnrollmentDashboardView } from '@/components/matricula/enrollment-dashboard-view';
import { getDistinctValues, getEnrollmentSummaryData } from '@/lib/api';
import type { Filters } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardProvider } from "@/contexts/DashboardContext";

export default async function MatriculaDashboardPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {

    // Parse filters
    const year = searchParams.ano ? parseInt(searchParams.ano as string) : undefined;
    const month = searchParams.mes ? parseInt(searchParams.mes as string) : undefined;
    const polo = searchParams.polo as string; // Multi-select handled by DashboardFilters but passed as comma list? 
    const processo = searchParams.processo as string;
    // Actually DashboardFilterControls uses standard URL params. 
    // Let's ensure type compatibility. The Filters type expects `polo?: string | string[]`.
    // MultiSelect usually sends values.

    const filters: Filters = {
        ano: year,
        mes: month,
        polo: polo ? (polo.includes(',') ? polo.split(',') : polo) : undefined,
        processo: processo
    };

    // Parallel Fetching
    const [distinctValues, summaryData] = await Promise.all([
        getDistinctValues(),
        getEnrollmentSummaryData(filters)
    ]);

    return (
        <DashboardProvider>
            <div className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard de Matrículas</h1>
                    <div className="flex gap-2">
                        <Link href="/matricula/listar">
                            <Button variant="outline">
                                <List className="mr-2 h-4 w-4" />
                                Listar Matrículas
                            </Button>
                        </Link>
                        <Link href="/matricula/nova">
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Nova Matrícula
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Filters */}
                <DashboardFilterControls distinctValues={distinctValues} showProcessoSeletivo={true} />

                {/* Main Dashboard View */}
                <Suspense fallback={<DashboardSkeleton />}>
                    <EnrollmentDashboardView summary={summaryData} filters={filters} />
                </Suspense>
            </div>
        </DashboardProvider>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
            </div>
            <Skeleton className="h-[400px] w-full" />
        </div>
    )
}


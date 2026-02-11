
import { Suspense } from 'react';
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

    // Parallel Fetching
    const [distinctValues] = await Promise.all([
        getDistinctValues()
    ]);

    // Handle Default Processo If Missing
    let currentProcesso = processo;
    if (!currentProcesso && distinctValues.processos && distinctValues.processos.length > 0) {
        // Since they are ordered by numero DESC, the first one is the "most recent"
        currentProcesso = distinctValues.processos[0].id;
    }

    const filters: Filters = {
        ano: year,
        mes: month,
        polo: polo ? (polo.includes(',') ? polo.split(',') : polo) : undefined,
        processo: currentProcesso
    };

    // Re-fetch summary with resolved filters
    const summaryData = await getEnrollmentSummaryData(filters);

    return (
        <DashboardProvider>
            <div className="p-6 space-y-6">
                {/* Filters */}
                <DashboardFilterControls
                    distinctValues={distinctValues}
                    showProcessoSeletivo={true}
                />

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


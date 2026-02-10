import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getDashboardData, getDistinctValues, getSummaryData } from "@/lib/api";
import { DashboardFilterControls } from "@/components/dashboard/dashboard-filters";
import type { Filters } from "@/lib/types";
import { DashboardProvider } from "@/contexts/DashboardContext";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    polo?: string;
    ano?: string;
    mes?: string;
    modo?: 'pago' | 'repasse';
  }>;
}) {
  const params = await searchParams;

  // Fetch distinct values first to determine the default year
  const distinctValues = await getDistinctValues();

  // Default to the most recent year with data, or the current year if no data exists.
  const latestYearWithData = distinctValues.anos.length > 0 ? distinctValues.anos[0] : new Date().getFullYear();

  const poloFilter = params?.polo ? params.polo.split(',') : undefined;

  // Safely parse URL params to prevent NaN errors
  const parsedAno = params?.ano ? parseInt(params.ano, 10) : NaN;
  const parsedMes = params?.mes ? parseInt(params.mes, 10) : NaN;

  const filters: Filters = {
    polo: poloFilter,
    ano: !isNaN(parsedAno) ? parsedAno : latestYearWithData,
    mes: !isNaN(parsedMes) ? parsedMes : undefined,
    modo: params?.modo === 'pago' ? 'pago' : 'repasse', // Default to repasse as requested
  };

  // Fetch all dashboard data in one efficient call
  const [dashboardData, summaryData] = await Promise.all([
    getDashboardData(filters),
    getSummaryData(filters),
  ]);

  const allData = {
    ...dashboardData,
    summaryData,
  }

  return (
    <DashboardProvider>
      <div className="space-y-6">
        <DashboardFilterControls distinctValues={distinctValues} />
        <DashboardView data={allData} distinctValues={distinctValues} filters={filters} />
      </div>
    </DashboardProvider>
  );
}

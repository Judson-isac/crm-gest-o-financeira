import { getFinancialRecords, getSummaryData, getDistinctValues, getImports } from "@/lib/api";
import { FinancialRecordsView } from "@/components/financial-records/financial-records-view";

export default async function FinancialRecordsPage() {
  const [{ records, totalPages, totalCount }, initialSummary, distinctValues, imports] = await Promise.all([
      getFinancialRecords({}, 1, 10),
      getSummaryData({}),
      getDistinctValues(),
      getImports()
  ]);

  return (
    <FinancialRecordsView
      initialRecords={records}
      initialTotalPages={totalPages}
      initialTotalCount={totalCount}
      initialSummary={initialSummary}
      distinctValues={distinctValues}
      initialImports={imports}
    />
  );
}

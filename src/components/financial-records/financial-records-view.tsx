"use client";

import { useState, useEffect, useTransition } from "react";
import { getFinancialRecords, getSummaryData, getImports } from "@/lib/api";
import type { FinancialRecord, SummaryData, Filters, ImportInfo } from "@/lib/types";
import { RecordsTable } from "./records-table";
import { SummaryCards } from "./summary-cards";
import { FilterControls } from "./filters";
import { ImportsTable } from "./imports-table";
import { ClientOnly } from "../client-only";

type FinancialRecordsViewProps = {
  initialRecords: FinancialRecord[];
  initialTotalPages: number;
  initialTotalCount: number;
  initialSummary: SummaryData;
  distinctValues: { polos: string[]; categorias: string[]; anos: number[] };
  initialImports: ImportInfo[];
};

export function FinancialRecordsView({
  initialRecords,
  initialTotalPages,
  initialTotalCount,
  initialSummary,
  distinctValues,
  initialImports,
}: FinancialRecordsViewProps) {
  const [records, setRecords] = useState(initialRecords);
  const [summary, setSummary] = useState(initialSummary);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [filters, setFilters] = useState<Filters>({});
  const [imports, setImports] = useState(initialImports);
  const [isPending, startTransition] = useTransition();

  const fetchData = (newFilters: Filters, newPage: number) => {
    startTransition(async () => {
      const [{ records, totalPages, totalCount }, summaryData, importsData] = await Promise.all([
        getFinancialRecords(newFilters, newPage),
        getSummaryData(newFilters),
        getImports(),
      ]);
      setRecords(records);
      setTotalPages(totalPages);
      setTotalCount(totalCount);
      setSummary(summaryData);
      setImports(importsData);
      setPage(newPage);
      setFilters(newFilters);
    });
  };

  const handleFilter = (newFilters: Filters) => {
    fetchData(newFilters, 1);
  };

  const handleClearFilters = () => {
    fetchData({}, 1);
  };

  const handlePageChange = (newPage: number) => {
    fetchData(filters, newPage);
  };

  const refreshData = () => {
    fetchData(filters, page);
  };

  useEffect(() => {
    setRecords(initialRecords);
    setSummary(initialSummary);
    setTotalPages(initialTotalPages);
    setTotalCount(initialTotalCount);
    setImports(initialImports);
    setPage(1);
    setFilters({});
  }, [initialRecords, initialSummary, initialTotalPages, initialTotalCount, initialImports]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ClientOnly>
            <FilterControls
              onFilter={handleFilter}
              onClear={handleClearFilters}
              distinctValues={distinctValues}
              isPending={isPending}
            />
          </ClientOnly>
          <SummaryCards summary={summary} isLoading={isPending} />
        </div>
        <ImportsTable imports={imports} onImportDeleted={refreshData} />
      </div>

      <RecordsTable
        records={records}
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={handlePageChange}
        isLoading={isPending}
        onRecordDeleted={refreshData}
        filters={filters}
      />
    </div>
  );
}

import { useCallback } from "react";
import type { z } from "zod";

import { useTableSorting } from "@/shared/hooks/use-table-sorting";
import { useUrlFilters } from "@/shared/hooks/use-url-filters";
import type { SortDirection } from "@/shared/lib/sorting";
import type { DataTablePagination } from "@/shared/ui/data-table";

type ListFilters = Record<string, unknown> & {
  sort: string;
  order: SortDirection;
  page: number;
  page_size: number;
};

interface UseListViewResult<TFilters extends ListFilters> {
  filters: TFilters;
  setFilter: <K extends keyof TFilters>(key: K, value: TFilters[K]) => void;
  setFilters: (patch: Partial<TFilters>) => void;
  clearAll: () => void;
  activeFilterCount: number;
  sorting: ReturnType<typeof useTableSorting>["sorting"];
  onSortingChange: ReturnType<typeof useTableSorting>["onSortingChange"];
  buildPagination: (totalCount: number | undefined) => DataTablePagination;
}

export function useListView<TSchema extends z.ZodType<ListFilters, unknown>>(
  schema: TSchema,
): UseListViewResult<z.infer<TSchema>> {
  type TFilters = z.infer<TSchema>;

  const { filters, setFilter, setFilters, clearAll, activeChips } = useUrlFilters(schema);

  const handleSortChange = useCallback(
    (sort: TFilters["sort"], order: SortDirection) =>
      setFilters({ sort, order } as Partial<TFilters>),
    [setFilters],
  );
  const { sorting, onSortingChange } = useTableSorting(
    filters.sort,
    filters.order,
    handleSortChange,
  );

  const buildPagination = useCallback(
    (totalCount: number | undefined): DataTablePagination => ({
      page: filters.page,
      pageCount:
        totalCount === undefined
          ? 1
          : Math.max(1, Math.ceil(totalCount / filters.page_size)),
      onPageChange: (page: number) => setFilter("page", page as TFilters["page"]),
      pageSize: filters.page_size,
      onPageSizeChange: (pageSize: number) =>
        setFilter("page_size", pageSize as TFilters["page_size"]),
      totalCount: totalCount ?? 0,
    }),
    [filters.page, filters.page_size, setFilter],
  );

  const activeFilterCount = activeChips.filter(
    (chip) => chip.key !== "sort" && chip.key !== "order" && chip.key !== "view",
  ).length;

  return {
    filters,
    setFilter,
    setFilters,
    clearAll,
    activeFilterCount,
    sorting,
    onSortingChange,
    buildPagination,
  };
}

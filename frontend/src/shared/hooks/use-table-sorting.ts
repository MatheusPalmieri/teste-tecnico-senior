import { useCallback, useMemo } from "react";
import type { OnChangeFn, SortingState } from "@tanstack/react-table";

import type { SortDirection } from "@/shared/lib/sorting";

interface UseTableSortingResult {
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
}

export function useTableSorting<TField extends string>(
  sort: TField | "",
  order: SortDirection,
  onChange: (sort: TField, order: SortDirection) => void,
): UseTableSortingResult {
  const sorting = useMemo<SortingState>(
    () => (sort ? [{ id: sort, desc: order === "desc" }] : []),
    [sort, order],
  );

  const onSortingChange = useCallback<OnChangeFn<SortingState>>(
    (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      const column = next[0];
      if (!column) return;
      onChange(column.id as TField, column.desc ? "desc" : "asc");
    },
    [sorting, onChange],
  );

  return { sorting, onSortingChange };
}

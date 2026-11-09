import { ScopeSearchFilterBar } from "@/shared/ui/scope-search-filter-bar";

import type { ArrivalsFilters } from "../api/types";

interface ArrivalsFilterBarProps {
  filters: ArrivalsFilters;
  onChange: <K extends keyof ArrivalsFilters>(key: K, value: ArrivalsFilters[K]) => void;
}

const SCOPE_OPTIONS: { value: ArrivalsFilters["scope"]; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "all_pending", label: "Todas" },
  { value: "overdue", label: "Atrasadas" },
  { value: "history", label: "Histórico" },
];

export function ArrivalsFilterBar({ filters, onChange }: ArrivalsFilterBarProps) {
  return (
    <ScopeSearchFilterBar
      scope={filters.scope}
      onScopeChange={(scope) => onChange("scope", scope)}
      scopeOptions={SCOPE_OPTIONS}
      search={filters.search}
      onSearchChange={(value) => onChange("search", value)}
      searchPlaceholder="Buscar hóspede"
    />
  );
}

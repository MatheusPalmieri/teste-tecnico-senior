import { ScopeSearchFilterBar } from "@/shared/ui/scope-search-filter-bar";

import type { DeparturesFilters } from "../api/types";

interface DeparturesFilterBarProps {
  filters: DeparturesFilters;
  onChange: <K extends keyof DeparturesFilters>(
    key: K,
    value: DeparturesFilters[K],
  ) => void;
}

const SCOPE_OPTIONS: { value: DeparturesFilters["scope"]; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "all_in_house", label: "Todas" },
  { value: "late", label: "Atrasadas" },
  { value: "history", label: "Histórico" },
];

export function DeparturesFilterBar({ filters, onChange }: DeparturesFilterBarProps) {
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

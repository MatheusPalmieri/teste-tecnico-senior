import { Car, UserCheck } from "lucide-react";

import { FilterChipSelect } from "@/shared/ui/filter-chip";
import { FilterToolbar } from "@/shared/ui/filter-toolbar";

import type { GuestFilters } from "../schemas/guest-filters";

const SEGMENT_OPTIONS = [
  { value: "in_house", label: "No hotel" },
  { value: "awaiting_check_in", label: "Aguardando check-in" },
] as const;

const PARKING_OPTIONS = [
  { value: "1", label: "Usa vaga" },
  { value: "0", label: "Não usa" },
] as const;

interface GuestsFilterBarProps {
  filters: GuestFilters;
  setFilter: <K extends keyof GuestFilters>(key: K, value: GuestFilters[K]) => void;
  clearAll: () => void;
  activeFilterCount: number;
}

export function GuestsFilterBar({
  filters,
  setFilter,
  clearAll,
  activeFilterCount,
}: GuestsFilterBarProps) {
  return (
    <FilterToolbar
      searchValue={filters.search}
      onSearchChange={(value) => setFilter("search", value)}
      searchPlaceholder="Buscar por nome ou documento"
      activeFilterCount={activeFilterCount}
      onClearFilters={clearAll}
    >
      <FilterChipSelect
        label="Situação"
        title="Segmento"
        icon={<UserCheck className="size-4" aria-hidden="true" />}
        options={SEGMENT_OPTIONS}
        value={filters.status}
        onChange={(value) => setFilter("status", value)}
      />

      <FilterChipSelect
        label="Estacionamento"
        title="Vaga de carro"
        align="end"
        icon={<Car className="size-4" aria-hidden="true" />}
        options={PARKING_OPTIONS}
        value={filters.uses_parking}
        onChange={(value) => setFilter("uses_parking", value)}
      />
    </FilterToolbar>
  );
}

import { Car, Tag } from "lucide-react";

import { DateRangePicker } from "@/shared/ui/date-range-picker";
import { FilterChipMultiSelect, FilterChipSelect } from "@/shared/ui/filter-chip";
import { FilterToolbar } from "@/shared/ui/filter-toolbar";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { RESERVATION_STATUS_UI } from "@/shared/ui/status-badge";

import { useReservationViewCounts } from "../hooks/use-reservation-view-counts";
import { VIEW_STATUSES } from "../schemas/reservation-filters";

import type { ReservationFilters, ReservationView } from "../schemas/reservation-filters";

const VIEW_OPTIONS: { value: ReservationView; label: string }[] = [
  { value: "open", label: "Em aberto" },
  { value: "history", label: "Histórico" },
];

const PARKING_OPTIONS = [
  { value: "1", label: "Usa vaga" },
  { value: "0", label: "Não usa" },
] as const;

interface ReservationsFilterBarProps {
  filters: ReservationFilters;
  setFilter: <K extends keyof ReservationFilters>(
    key: K,
    value: ReservationFilters[K],
  ) => void;
  setFilters: (patch: Partial<ReservationFilters>) => void;
  onViewChange: (view: ReservationView) => void;
  clearAll: () => void;
  activeFilterCount: number;
  currentViewCount: number | undefined;
}

export function ReservationsFilterBar({
  filters,
  setFilter,
  setFilters,
  onViewChange,
  clearAll,
  activeFilterCount,
  currentViewCount,
}: ReservationsFilterBarProps) {
  const viewCounts = useReservationViewCounts(filters, currentViewCount);

  const statuses = VIEW_STATUSES[filters.view];
  const statusOptions = statuses.map((status) => ({
    value: status,
    label: RESERVATION_STATUS_UI[status].label,
  }));
  const selectedStatuses = statuses.filter((status) => filters.status.includes(status));

  const tabs = (
    <SegmentedControl
      label="Alternar entre reservas em aberto e histórico"
      value={filters.view}
      onValueChange={(value) => onViewChange(value as ReservationView)}
      options={VIEW_OPTIONS.map((option) => {
        const count = viewCounts[option.value];
        return {
          value: option.value,
          label: (
            <>
              {option.label}
              {count !== undefined && (
                <span className="ml-1.5 tabular-nums opacity-60">{count}</span>
              )}
            </>
          ),
        };
      })}
    />
  );

  return (
    <FilterToolbar
      leading={tabs}
      searchValue={filters.search}
      onSearchChange={(value) => setFilter("search", value)}
      searchPlaceholder="Buscar por hóspede ou código"
      activeFilterCount={activeFilterCount}
      onClearFilters={clearAll}
    >
      <FilterChipMultiSelect
        label="Status"
        icon={<Tag className="size-4" aria-hidden="true" />}
        options={statusOptions}
        value={selectedStatuses}
        onChange={(next) => setFilter("status", next)}
      />

      <DateRangePicker
        from={filters.date_from}
        to={filters.date_to}
        onChange={({ from, to }) => setFilters({ date_from: from, date_to: to })}
        label="Período"
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

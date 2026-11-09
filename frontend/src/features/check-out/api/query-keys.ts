import type { DeparturesFilters } from "./types";

export const checkOutKeys = {
  all: ["check-out"] as const,
  departures: (filters: DeparturesFilters) =>
    [...checkOutKeys.all, "departures", filters] as const,
  preview: (reservationId: string) =>
    [...checkOutKeys.all, "preview", reservationId] as const,
};

import { useQuery } from "@tanstack/react-query";

import { reservationKeys } from "../api/query-keys";
import { reservationsApi } from "../api/reservations-api";

import type { ReservationFilters, ReservationView } from "../schemas/reservation-filters";

export type ReservationViewCounts = Record<ReservationView, number | undefined>;

export function useReservationViewCounts(
  filters: ReservationFilters,
  currentViewCount: number | undefined,
): ReservationViewCounts {
  const otherView: ReservationView = filters.view === "open" ? "history" : "open";
  const otherViewFilters = {
    ...filters,
    view: otherView,
    status: [],
    sort: "",
    page: 1,
    page_size: 1,
  };

  const { data } = useQuery({
    queryKey: reservationKeys.list(otherViewFilters),
    queryFn: () => reservationsApi.list(otherViewFilters),
  });

  return {
    open: filters.view === "open" ? currentViewCount : data?.count,
    history: filters.view === "history" ? currentViewCount : data?.count,
  };
}

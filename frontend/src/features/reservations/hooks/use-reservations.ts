import { useQuery } from "@tanstack/react-query";

import { reservationsApi } from "../api/reservations-api";
import { reservationKeys } from "../api/query-keys";
import type { ReservationListFilters } from "../api/types";

export function useReservations(filters: ReservationListFilters) {
  return useQuery({
    queryKey: reservationKeys.list(filters),
    queryFn: () => reservationsApi.list(filters),
  });
}

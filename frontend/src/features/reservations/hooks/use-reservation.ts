import { useQuery } from "@tanstack/react-query";

import { reservationsApi } from "../api/reservations-api";
import { reservationKeys } from "../api/query-keys";

export function useReservation(id: string | null) {
  return useQuery({
    queryKey: reservationKeys.detail(id ?? ""),
    queryFn: () => reservationsApi.get(id as string),
    enabled: id !== null,
  });
}

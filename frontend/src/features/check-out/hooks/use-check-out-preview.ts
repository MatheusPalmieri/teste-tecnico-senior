import { useQuery } from "@tanstack/react-query";

import { checkOutApi } from "../api/check-out-api";
import { checkOutKeys } from "../api/query-keys";

/** Sem cache: o total muda ao passar das 12h. */
export function useCheckOutPreview(reservationId: string | null) {
  return useQuery({
    queryKey: checkOutKeys.preview(reservationId ?? ""),
    queryFn: () => checkOutApi.preview(reservationId as string),
    enabled: reservationId !== null,
    staleTime: 0,
    gcTime: 0,
  });
}

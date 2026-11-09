import { useQuery } from "@tanstack/react-query";

import { checkInApi } from "../api/check-in-api";
import { checkInKeys } from "../api/query-keys";
import type { ArrivalsFilters } from "../api/types";

export function useArrivals(filters: ArrivalsFilters) {
  return useQuery({
    queryKey: checkInKeys.arrivals(filters),
    queryFn: () => checkInApi.arrivals(filters),
  });
}

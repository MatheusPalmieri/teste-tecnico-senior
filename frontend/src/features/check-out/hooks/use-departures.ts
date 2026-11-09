import { useQuery } from "@tanstack/react-query";

import { checkOutApi } from "../api/check-out-api";
import { checkOutKeys } from "../api/query-keys";
import type { DeparturesFilters } from "../api/types";

export function useDepartures(filters: DeparturesFilters) {
  return useQuery({
    queryKey: checkOutKeys.departures(filters),
    queryFn: () => checkOutApi.departures(filters),
  });
}

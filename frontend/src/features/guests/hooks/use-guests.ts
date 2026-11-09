import { useQuery } from "@tanstack/react-query";

import { guestsApi } from "../api/guests-api";
import { guestKeys } from "../api/query-keys";
import type { GuestListFilters } from "../api/types";

export function useGuests(filters: GuestListFilters) {
  return useQuery({
    queryKey: guestKeys.list(filters),
    queryFn: () => guestsApi.list(filters),
    staleTime: 2 * 60 * 1000,
  });
}

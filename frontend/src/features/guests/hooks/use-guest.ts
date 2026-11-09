import { useQuery } from "@tanstack/react-query";

import { guestsApi } from "../api/guests-api";
import { guestKeys } from "../api/query-keys";

export function useGuest(id: string | null) {
  return useQuery({
    queryKey: guestKeys.detail(id ?? ""),
    queryFn: () => guestsApi.get(id as string),
    enabled: id !== null,
    staleTime: 2 * 60 * 1000,
  });
}

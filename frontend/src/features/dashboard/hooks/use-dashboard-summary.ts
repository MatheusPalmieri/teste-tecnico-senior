import { useQuery } from "@tanstack/react-query";

import { dashboardApi } from "../api/dashboard-api";
import { dashboardKeys } from "../api/query-keys";

export function useDashboardSummary() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: () => dashboardApi.summary(),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}

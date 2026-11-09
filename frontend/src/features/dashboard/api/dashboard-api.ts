import { http } from "@/shared/lib/http";

import type { DashboardSummary } from "./types";

export const dashboardApi = {
  async summary(): Promise<DashboardSummary> {
    const { data } = await http.get<DashboardSummary>("/dashboard/summary/");
    return data;
  },
};

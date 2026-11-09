import type { ArrivalsFilters } from "./types";

export const checkInKeys = {
  all: ["check-in"] as const,
  arrivals: (filters: ArrivalsFilters) =>
    [...checkInKeys.all, "arrivals", filters] as const,
};

import { z } from "zod";

export const arrivalsFiltersSchema = z.object({
  search: z.string().default(""),
  scope: z
    .enum(["today", "all_pending", "overdue", "history"])
    .catch("today")
    .default("today"),
});

export type ArrivalsFilters = z.infer<typeof arrivalsFiltersSchema>;

export type ArrivalsScope = ArrivalsFilters["scope"];

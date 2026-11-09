import { z } from "zod";

export const departuresFiltersSchema = z.object({
  search: z.string().default(""),
  scope: z
    .enum(["today", "all_in_house", "late", "history"])
    .catch("today")
    .default("today"),
});

export type DeparturesFilters = z.infer<typeof departuresFiltersSchema>;

export type DeparturesScope = DeparturesFilters["scope"];

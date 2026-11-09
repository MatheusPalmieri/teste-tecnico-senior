import { z } from "zod";

import { sortFilterSchema } from "@/shared/lib/sorting";

export const GUEST_SORT_FIELDS = ["name", "document", "phone"] as const;

export type GuestSortField = (typeof GUEST_SORT_FIELDS)[number];

export const guestFiltersSchema = z.object({
  search: z.string().default(""),
  status: z.enum(["", "in_house", "awaiting_check_in"]).catch("").default(""),
  uses_parking: z.enum(["", "1", "0"]).catch("").default(""),
  ...sortFilterSchema(GUEST_SORT_FIELDS, ""),
  page: z.coerce.number().int().min(1).catch(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).catch(10).default(10),
});

export type GuestFilters = z.infer<typeof guestFiltersSchema>;

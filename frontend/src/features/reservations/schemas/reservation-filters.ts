import { z } from "zod";

import { sortFilterSchema } from "@/shared/lib/sorting";
import type { ReservationStatus } from "@/shared/ui/status-badge";

export const RESERVATION_SORT_FIELDS = [
  "code",
  "guest",
  "period",
  "room",
  "status",
] as const;

export type ReservationSortField = (typeof RESERVATION_SORT_FIELDS)[number];

export const RESERVATION_ORDERING_FIELDS: Readonly<Record<ReservationSortField, string>> =
  {
    code: "code",
    guest: "guest__name",
    period: "check_in_date",
    room: "room",
    status: "status",
  };

export const RESERVATION_VIEWS = ["open", "history"] as const;

export type ReservationView = (typeof RESERVATION_VIEWS)[number];

export const VIEW_STATUSES: Readonly<
  Record<ReservationView, readonly ReservationStatus[]>
> = {
  open: ["RESERVED", "CHECKED_IN"],
  history: ["CHECKED_OUT", "CANCELLED"],
};

export const reservationFiltersSchema = z.object({
  search: z.string().default(""),
  view: z.enum(RESERVATION_VIEWS).catch("open").default("open"),
  status: z.array(z.string()).default([]),
  date_from: z.string().default(""),
  date_to: z.string().default(""),
  uses_parking: z.enum(["", "1", "0"]).catch("").default(""),
  ...sortFilterSchema(RESERVATION_SORT_FIELDS, "period", "desc"),
  page: z.coerce.number().int().min(1).catch(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).catch(10).default(10),
});

export type ReservationFilters = z.infer<typeof reservationFiltersSchema>;

import { http } from "@/shared/lib/http";
import { toOrderingParam } from "@/shared/lib/sorting";

import {
  RESERVATION_ORDERING_FIELDS,
  VIEW_STATUSES,
} from "../schemas/reservation-filters";

import type {
  AvailableRooms,
  Breakdown,
  Page,
  Reservation,
  ReservationInput,
  ReservationListFilters,
  ReservationMutationResult,
} from "./types";

export const reservationsApi = {
  async list(filters: Partial<ReservationListFilters>): Promise<Page<Reservation>> {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);

    const viewStatuses = VIEW_STATUSES[filters.view ?? "open"];
    const selected = (filters.status ?? []).filter((status) =>
      (viewStatuses as readonly string[]).includes(status),
    );
    for (const status of selected.length > 0 ? selected : viewStatuses) {
      params.append("status", status);
    }
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    if (filters.uses_parking) params.set("uses_parking", filters.uses_parking);
    if (filters.sort) {
      params.set(
        "ordering",
        toOrderingParam(
          filters.sort,
          filters.order ?? "asc",
          RESERVATION_ORDERING_FIELDS,
        ),
      );
    }
    if (filters.page) params.set("page", String(filters.page));
    if (filters.page_size) params.set("page_size", String(filters.page_size));

    const { data } = await http.get<Page<Reservation>>("/reservations/", { params });
    return data;
  },

  async get(id: string): Promise<Reservation> {
    const { data } = await http.get<Reservation>(`/reservations/${id}/`);
    return data;
  },

  async create(input: ReservationInput): Promise<ReservationMutationResult> {
    const { data } = await http.post<ReservationMutationResult>("/reservations/", input);
    return data;
  },

  async update(id: string, input: ReservationInput): Promise<ReservationMutationResult> {
    const { data } = await http.patch<ReservationMutationResult>(
      `/reservations/${id}/`,
      input,
    );
    return data;
  },

  async cancel(id: string): Promise<Reservation> {
    const { data } = await http.post<Reservation>(`/reservations/${id}/cancel/`);
    return data;
  },

  async quote(input: {
    check_in_date: string;
    check_out_date: string;
    uses_parking: boolean;
  }): Promise<Breakdown> {
    const { data } = await http.post<Breakdown>("/reservations/quote/", input);
    return data;
  },

  async availableRooms(params: {
    check_in_date: string;
    check_out_date: string;
    exclude_reservation?: string;
  }): Promise<AvailableRooms> {
    const { data } = await http.get<AvailableRooms>("/rooms/available/", { params });
    return data;
  },
};

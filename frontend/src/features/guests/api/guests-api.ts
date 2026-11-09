import { http } from "@/shared/lib/http";
import { toOrderingParam } from "@/shared/lib/sorting";

import type { Guest, GuestDetail, GuestInput, GuestListFilters, Page } from "./types";

export const guestsApi = {
  async list(filters: Partial<GuestListFilters>): Promise<Page<Guest>> {
    const { data } = await http.get<Page<Guest>>("/guests/", {
      params: {
        search: filters.search || undefined,
        status: filters.status || undefined,
        uses_parking: filters.uses_parking || undefined,
        ordering: filters.sort
          ? toOrderingParam(filters.sort, filters.order ?? "asc")
          : undefined,
        page: filters.page,
        page_size: filters.page_size,
      },
    });
    return data;
  },

  async get(id: string): Promise<GuestDetail> {
    const { data } = await http.get<GuestDetail>(`/guests/${id}/`);
    return data;
  },

  async create(input: GuestInput): Promise<Guest> {
    const { data } = await http.post<Guest>("/guests/", input);
    return data;
  },

  async update(id: string, input: GuestInput): Promise<Guest> {
    const { data } = await http.patch<Guest>(`/guests/${id}/`, input);
    return data;
  },

  async remove(id: string): Promise<void> {
    await http.delete(`/guests/${id}/`);
  },
};

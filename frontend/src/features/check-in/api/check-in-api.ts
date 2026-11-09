import { http } from "@/shared/lib/http";
import type { Reservation } from "@/features/reservations";

import type { Arrival, ArrivalsFilters, CheckInInput } from "./types";

export const checkInApi = {
  async arrivals(
    filters: Partial<ArrivalsFilters>,
  ): Promise<{ count: number; results: Arrival[] }> {
    const { data } = await http.get<{ count: number; results: Arrival[] }>(
      "/reservations/arrivals/",
      {
        params: { scope: filters.scope, search: filters.search || undefined },
      },
    );
    return data;
  },

  async checkIn(reservationId: string, input: CheckInInput): Promise<Reservation> {
    const { data } = await http.post<Reservation>(
      `/reservations/${reservationId}/check-in/`,
      input,
    );
    return data;
  },
};

import { http } from "@/shared/lib/http";
import type { Reservation } from "@/features/reservations";

import type { CheckOutPreview, Departure, DeparturesFilters } from "./types";

export interface CheckOutInput {
  expectedTotal: string;
  notes?: string;
}

export const checkOutApi = {
  async departures(
    filters: Partial<DeparturesFilters>,
  ): Promise<{ count: number; results: Departure[] }> {
    const { data } = await http.get<{ count: number; results: Departure[] }>(
      "/reservations/departures/",
      {
        params: { scope: filters.scope, search: filters.search || undefined },
      },
    );
    return data;
  },

  async preview(reservationId: string): Promise<CheckOutPreview> {
    const { data } = await http.get<CheckOutPreview>(
      `/reservations/${reservationId}/check-out-preview/`,
    );
    return data;
  },

  async checkOut(reservationId: string, input: CheckOutInput): Promise<Reservation> {
    const { data } = await http.post<Reservation>(
      `/reservations/${reservationId}/check-out/`,
      { expected_total: input.expectedTotal, notes: input.notes },
    );
    return data;
  },
};

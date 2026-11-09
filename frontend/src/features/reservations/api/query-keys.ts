import type { ReservationListFilters } from "./types";

export const reservationKeys = {
  all: ["reservations"] as const,
  lists: () => [...reservationKeys.all, "list"] as const,
  list: (filters: ReservationListFilters) =>
    [...reservationKeys.lists(), filters] as const,
  detail: (id: string) => [...reservationKeys.all, "detail", id] as const,
  availableRooms: (checkIn: string, checkOut: string, excludeId?: string) =>
    [
      ...reservationKeys.all,
      "available-rooms",
      checkIn,
      checkOut,
      excludeId ?? null,
    ] as const,
  quote: (params: { checkInDate: string; checkOutDate: string; usesParking: boolean }) =>
    [...reservationKeys.all, "quote", params] as const,
};

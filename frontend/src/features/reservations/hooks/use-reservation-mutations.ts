import { useMutation, useQueryClient } from "@tanstack/react-query";

import { checkInKeys } from "@/features/check-in";
import { checkOutKeys } from "@/features/check-out";
import { dashboardKeys } from "@/features/dashboard";
import { guestKeys } from "@/features/guests";

import { reservationsApi } from "../api/reservations-api";
import { reservationKeys } from "../api/query-keys";
import type { ReservationInput } from "../api/types";

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>): void {
  queryClient.invalidateQueries({ queryKey: reservationKeys.all });
  queryClient.invalidateQueries({ queryKey: checkInKeys.all });
  queryClient.invalidateQueries({ queryKey: checkOutKeys.all });
  queryClient.invalidateQueries({ queryKey: guestKeys.all });
  queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReservationInput) => reservationsApi.create(input),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useUpdateReservation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReservationInput) => reservationsApi.update(id, input),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useCancelReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reservationsApi.cancel(id),
    onSuccess: () => invalidateAll(queryClient),
  });
}

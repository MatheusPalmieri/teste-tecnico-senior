import { useMutation, useQueryClient } from "@tanstack/react-query";

import { dashboardKeys } from "@/features/dashboard";
import { guestKeys } from "@/features/guests";
import { reservationKeys } from "@/features/reservations";

import { checkInApi } from "../api/check-in-api";
import { checkInKeys } from "../api/query-keys";
import type { CheckInInput } from "../api/types";

export function useCheckIn(reservationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CheckInInput) => checkInApi.checkIn(reservationId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checkInKeys.all });
      queryClient.invalidateQueries({ queryKey: reservationKeys.all });
      queryClient.invalidateQueries({ queryKey: guestKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

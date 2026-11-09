import { useMutation, useQueryClient } from "@tanstack/react-query";

import { dashboardKeys } from "@/features/dashboard";
import { guestKeys } from "@/features/guests";
import { reservationKeys } from "@/features/reservations";

import { checkOutApi, type CheckOutInput } from "../api/check-out-api";
import { checkOutKeys } from "../api/query-keys";

export function useCheckOut(reservationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CheckOutInput) => checkOutApi.checkOut(reservationId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checkOutKeys.all });
      queryClient.invalidateQueries({ queryKey: reservationKeys.all });
      queryClient.invalidateQueries({ queryKey: guestKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

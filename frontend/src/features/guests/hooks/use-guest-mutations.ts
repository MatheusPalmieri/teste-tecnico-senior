import { useMutation, useQueryClient } from "@tanstack/react-query";

import { dashboardKeys } from "@/features/dashboard";

import { guestsApi } from "../api/guests-api";
import { guestKeys } from "../api/query-keys";
import type { GuestInput } from "../api/types";

export function useCreateGuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GuestInput) => guestsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guestKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

export function useUpdateGuest(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GuestInput) => guestsApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guestKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

export function useDeleteGuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => guestsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guestKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

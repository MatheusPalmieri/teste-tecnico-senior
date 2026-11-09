import { useMutation, useQueryClient } from "@tanstack/react-query";

import { authKeys } from "@/features/auth";

import { settingsApi, type UpdateProfileInput } from "../api/settings-api";

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => settingsApi.updateProfile(input),
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.me(), user);
    },
  });
}

import { useMutation } from "@tanstack/react-query";

import { settingsApi, type ChangePasswordInput } from "../api/settings-api";

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => settingsApi.changePassword(input),
  });
}

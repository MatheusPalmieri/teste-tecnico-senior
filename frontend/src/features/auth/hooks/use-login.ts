import { useMutation, useQueryClient } from "@tanstack/react-query";

import { authApi } from "../api/auth-api";
import { authKeys } from "../api/query-keys";

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.me(), user);
    },
  });
}

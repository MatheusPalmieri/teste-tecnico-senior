import { useMutation, useQueryClient } from "@tanstack/react-query";

import { authApi } from "../api/auth-api";
import { authKeys } from "../api/query-keys";
import type { RegisterInput } from "../api/types";

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.me(), user);
    },
  });
}

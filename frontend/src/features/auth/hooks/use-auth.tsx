import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";

import { onSessionExpired } from "@/shared/lib/auth-events";

import { authApi } from "../api/auth-api";
import { authKeys } from "../api/query-keys";
import type { AuthUser } from "../api/types";

interface AuthContextValue {
  user: AuthUser | undefined;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: user, isLoading } = useQuery({
    queryKey: authKeys.me(),
    queryFn: authApi.me,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    return onSessionExpired(() => {
      queryClient.setQueryData(authKeys.me(), undefined);
      queryClient.clear();
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`, {
        replace: true,
      });
    });
  }, [queryClient, navigate, location.pathname]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: Boolean(user), isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth precisa estar dentro de um AuthProvider.");
  }
  return context;
}

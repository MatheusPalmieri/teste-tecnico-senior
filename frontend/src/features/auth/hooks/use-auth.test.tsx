import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { describe, expect, it } from "vitest";

import { emitSessionExpired } from "@/shared/lib/auth-events";
import { server } from "@/test/msw/server";

import { AuthProvider, useAuth } from "./use-auth";

const API_URL = "http://localhost:8000/api";

const USER = {
  id: "1",
  name: "Atendente Demo",
  email: "atendente@hotel.com",
  date_joined: "2026-01-01T00:00:00-03:00",
};

function mockSession(): void {
  server.use(http.get(`${API_URL}/auth/me/`, () => HttpResponse.json(USER)));
}

function wrapper(route = "/reservas") {
  return function Wrapper({ children }: { children: ReactNode }) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          <AuthProvider>{children}</AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe("useAuth", () => {
  it("fora de um `AuthProvider`, falha alto em vez de devolver sessão vazia", () => {
    expect(() => renderHook(() => useAuth())).toThrowError(
      "useAuth precisa estar dentro de um AuthProvider.",
    );
  });

  it("faz o bootstrap perguntando ao backend quem esta logado", async () => {
    mockSession();
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper() });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.name).toBe("Atendente Demo");
  });

  it("sem sessão, o bootstrap termina sem usuário (o 401 e resposta esperada)", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeUndefined();
  });

  it("401 em qualquer requisição leva ao login preservando a rota pretendida", async () => {
    mockSession();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    function CurrentLocation() {
      const location = useLocation();
      return <span data-testid="url">{`${location.pathname}${location.search}`}</span>;
    }

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/reservas"]}>
          <AuthProvider>
            <Routes>
              <Route path="/reservas" element={<CurrentLocation />} />
              <Route path="/login" element={<CurrentLocation />} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("url")).toHaveTextContent("/reservas"));

    act(() => emitSessionExpired());

    await waitFor(() =>
      expect(screen.getByTestId("url")).toHaveTextContent("/login?next=%2Freservas"),
    );
  });

  it("a expiração derruba a sessão em memória", async () => {
    mockSession();
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    server.use(
      http.get(`${API_URL}/auth/me/`, () =>
        HttpResponse.json(
          { detail: "Não autenticado.", code: "not_authenticated" },
          { status: 401 },
        ),
      ),
    );
    act(() => emitSessionExpired());

    await waitFor(() => expect(result.current.isAuthenticated).toBe(false));
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, renderHook, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { server } from "@/test/msw/server";

import { useLogout } from "./use-logout";

const API_URL = "http://localhost:8000/api";

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/reservas"]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe("useLogout", () => {
  it("limpa o cache do cliente ao sair", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["guests"], [{ id: "g1" }]);
    const clear = vi.spyOn(queryClient, "clear");
    const { result } = renderHook(() => useLogout(), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate();

    await waitFor(() => expect(clear).toHaveBeenCalled());
    expect(queryClient.getQueryData(["guests"])).toBeUndefined();
  });

  it("limpa o cache mesmo quando a chamada de rede falha", async () => {
    server.use(
      http.post(`${API_URL}/auth/logout/`, () =>
        HttpResponse.json({ detail: "Erro.", code: "server_error" }, { status: 500 }),
      ),
    );
    const queryClient = new QueryClient();
    queryClient.setQueryData(["guests"], [{ id: "g1" }]);
    const { result } = renderHook(() => useLogout(), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate();

    await waitFor(() => expect(queryClient.getQueryData(["guests"])).toBeUndefined());
  });

  it("leva para o login sem deixar a rota anterior no histórico", async () => {
    const queryClient = new QueryClient();

    function LogoutOnMount() {
      const logout = useLogout();
      const location = useLocation();
      return (
        <>
          <span data-testid="url">{location.pathname}</span>
          <button type="button" onClick={() => logout.mutate()}>
            Sair
          </button>
        </>
      );
    }

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/reservas"]}>
          <Routes>
            <Route path="/reservas" element={<LogoutOnMount />} />
            <Route path="/login" element={<span data-testid="url">/login</span>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    screen.getByRole("button", { name: "Sair" }).click();

    await waitFor(() => expect(screen.getByTestId("url")).toHaveTextContent("/login"));
  });
});

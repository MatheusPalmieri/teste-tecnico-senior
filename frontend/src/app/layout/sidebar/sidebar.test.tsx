import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { routes } from "@/app/routes";
import { server } from "@/test/msw/server";
import { render, screen, waitFor } from "@/test/utils";
import { TooltipProvider } from "@/shared/ui/tooltip";

const API_URL = "http://localhost:8000/api";

function renderAppAt(route: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(routes, { initialEntries: [route] });

  return render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

function mockAuthenticated() {
  server.use(
    http.get(`${API_URL}/auth/me/`, () =>
      HttpResponse.json({
        id: "1",
        name: "Atendente Demo",
        email: "atendente@hotel.com",
        date_joined: "2026-01-01T00:00:00-03:00",
      }),
    ),
  );
}

async function waitForShell(): Promise<void> {
  await screen.findByRole("link", { name: /hóspedes/i });
}

describe("Sidebar", () => {
  beforeEach(() => {
    mockAuthenticated();
    window.localStorage.clear();
  });

  it("renderiza todos os itens de navegação", async () => {
    renderAppAt("/");

    await waitForShell();
    for (const label of ["Hóspedes", "Reservas", "Check-in", "Check-out"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("o item da rota atual recebe aria-current=page", async () => {
    renderAppAt("/hospedes");

    const link = await screen.findByRole("link", { name: /hóspedes/i });
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("não renderiza título de grupo acima da navegação", async () => {
    renderAppAt("/");
    await waitForShell();
    expect(screen.queryByRole("heading", { name: /navega/i })).not.toBeInTheDocument();
  });

  it("botão recolher alterna e persiste em localStorage", async () => {
    const user = userEvent.setup();
    renderAppAt("/");

    await waitForShell();

    const toggle = screen.getByRole("button", { name: /recolher menu/i });
    await user.click(toggle);

    await waitFor(() =>
      expect(window.localStorage.getItem("hotel:sidebar-collapsed")).toBe("1"),
    );
  });
});

describe("MobileTopbar", () => {
  beforeEach(() => {
    mockAuthenticated();
  });

  it("só existe abaixo de 1024px — a classe md:hidden a esconde no desktop", async () => {
    renderAppAt("/");
    await waitForShell();

    const hamburger = screen.getByRole("button", { name: /abrir menu/i });
    const topbar = hamburger.closest("header");
    expect(topbar).toHaveClass("md:hidden");
  });
});

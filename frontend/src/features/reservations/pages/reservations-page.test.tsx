import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { server } from "@/test/msw/server";
import { renderWithProviders, screen, waitFor } from "@/test/utils";

import { ReservationsPage } from "./reservations-page";

const API_URL = "http://localhost:8000/api";
const EMPTY_PAGE = { count: 0, next: null, previous: null, results: [] };

function captureRequestedStatuses(): string[][] {
  const requested: string[][] = [];
  server.use(
    http.get(`${API_URL}/reservations/`, ({ request }) => {
      const params = new URL(request.url).searchParams;
      if (params.get("page_size") !== "1") {
        requested.push(params.getAll("status"));
      }
      return HttpResponse.json(EMPTY_PAGE);
    }),
  );
  return requested;
}

describe("ReservationsPage", () => {
  it("cada aba mostra a própria contagem e a inativa pede page_size=1", async () => {
    const historyRequests: URL[] = [];
    server.use(
      http.get(`${API_URL}/reservations/`, ({ request }) => {
        const url = new URL(request.url);
        const isHistory = url.searchParams.getAll("status").includes("CHECKED_OUT");
        if (isHistory) historyRequests.push(url);
        return HttpResponse.json({ ...EMPTY_PAGE, count: isHistory ? 6 : 8 });
      }),
    );

    renderWithProviders(<ReservationsPage />, { withAuth: false });

    expect(
      await screen.findByRole("button", { name: /Em aberto\s*8/ }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /Histórico\s*6/ }),
    ).toBeInTheDocument();
    expect(historyRequests[0]?.searchParams.get("page_size")).toBe("1");
  });

  it("lista as reservas devolvidas pela API", async () => {
    renderWithProviders(<ReservationsPage />, { withAuth: false });

    expect(await screen.findByText("R-0001")).toBeInTheDocument();
    expect(screen.getByText("Jose Antonio Silva")).toBeInTheDocument();
  });

  it("mostra o total estimado enquanto a reserva não fez check-out", async () => {
    renderWithProviders(<ReservationsPage />, { withAuth: false });

    expect(await screen.findByText("R$ 470,00")).toBeInTheDocument();
  });

  it("a aba em aberto pede à API só RESERVED e CHECKED_IN", async () => {
    const requested = captureRequestedStatuses();
    renderWithProviders(<ReservationsPage />, { withAuth: false, route: "/reservas" });

    await waitFor(() => expect(requested.length).toBeGreaterThan(0));
    expect(requested[0]).toEqual(["RESERVED", "CHECKED_IN"]);
  });

  it("trocar para a aba de histórico pede CHECKED_OUT e CANCELLED", async () => {
    const user = userEvent.setup();
    const requested = captureRequestedStatuses();
    renderWithProviders(<ReservationsPage />, { withAuth: false, route: "/reservas" });
    await waitFor(() => expect(requested.length).toBeGreaterThan(0));

    await user.click(screen.getByRole("button", { name: /Histórico/ }));

    await waitFor(() => expect(requested.at(-1)).toEqual(["CHECKED_OUT", "CANCELLED"]));
  });

  it("abre na aba de histórico quando a URL pede", async () => {
    const requested = captureRequestedStatuses();
    renderWithProviders(<ReservationsPage />, {
      withAuth: false,
      route: "/reservas?view=history",
    });

    expect(
      await screen.findByRole("button", { name: "Histórico", pressed: true }),
    ).toBeInTheDocument();
    await waitFor(() => expect(requested[0]).toEqual(["CHECKED_OUT", "CANCELLED"]));
  });

  it("status da outra aba na URL é ignorado", async () => {
    const requested = captureRequestedStatuses();
    renderWithProviders(<ReservationsPage />, {
      withAuth: false,
      route: "/reservas?view=open&status=CANCELLED",
    });

    await waitFor(() => expect(requested.length).toBeGreaterThan(0));
    expect(requested[0]).toEqual(["RESERVED", "CHECKED_IN"]);
  });

  it("mostra a contagem total no cabeçalho da página", async () => {
    renderWithProviders(<ReservationsPage />, { withAuth: false });

    expect(await screen.findByText("1 reservas encontradas")).toBeInTheDocument();
  });
});

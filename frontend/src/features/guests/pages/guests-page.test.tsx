import { HttpResponse, http } from "msw";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { server } from "@/test/msw/server";
import { renderWithProviders, screen, waitFor, within } from "@/test/utils";

import { GuestsPage } from "./guests-page";

const API_URL = "http://localhost:8000/api";
const EMPTY_PAGE = { count: 0, next: null, previous: null, results: [] };

describe("GuestsPage", () => {
  it("lista os hóspedes devolvidos pela API", async () => {
    renderWithProviders(<GuestsPage />, { withAuth: false });

    expect(await screen.findByText("Jose Antonio Silva")).toBeInTheDocument();
    expect(screen.getByText("Maria Fernanda")).toBeInTheDocument();
  });

  it("mostra o segmento operacional de cada hóspede", async () => {
    renderWithProviders(<GuestsPage />, { withAuth: false });

    await waitFor(() => expect(screen.getByText("No hotel")).toBeInTheDocument());
    expect(screen.getByText("Sem reserva ativa")).toBeInTheDocument();
  });

  it("mostra a contagem total no cabeçalho da página", async () => {
    renderWithProviders(<GuestsPage />, { withAuth: false });

    expect(await screen.findByText("2 hóspedes encontrados")).toBeInTheDocument();
  });

  it("envia o `ordering` montado a partir de ?sort/&order ao ordenar uma coluna", async () => {
    const requestedOrderings: (string | null)[] = [];
    server.use(
      http.get(`${API_URL}/guests/`, ({ request }) => {
        requestedOrderings.push(new URL(request.url).searchParams.get("ordering"));
        return HttpResponse.json(EMPTY_PAGE);
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<GuestsPage />, { withAuth: false });
    await waitFor(() => expect(requestedOrderings).toHaveLength(1));
    expect(requestedOrderings[0]).toBeNull();

    const nameHeader = () => screen.getByRole("button", { name: /nome/i });
    expect(nameHeader().querySelector("svg")).toHaveClass("lucide-arrow-up-down");
    expect(nameHeader().closest("th")).toHaveAttribute("aria-sort", "none");

    await user.click(nameHeader());
    await waitFor(() => expect(requestedOrderings).toHaveLength(2));
    expect(requestedOrderings[1]).toBe("name");
    await waitFor(() =>
      expect(nameHeader().querySelector("svg")).toHaveClass("lucide-arrow-up"),
    );

    await user.click(nameHeader());
    await waitFor(() => expect(requestedOrderings).toHaveLength(3));
    expect(requestedOrderings[2]).toBe("-name");
    await waitFor(() =>
      expect(nameHeader().querySelector("svg")).toHaveClass("lucide-arrow-down"),
    );

    await user.click(screen.getByRole("button", { name: /telefone/i }));
    await waitFor(() => expect(requestedOrderings).toHaveLength(4));
    expect(requestedOrderings[3]).toBe("phone");
  });

  it("mostra o período da reserva atual na tabela", async () => {
    renderWithProviders(<GuestsPage />, { withAuth: false });
    await screen.findByText("Jose Antonio Silva");

    expect(screen.getByText("03/09/2026 - 06/09/2026 · Quarto 204")).toBeInTheDocument();
  });

  it("abre o cadastro em dialog (não página) e mostra os erros ao enviar vazio", async () => {
    const user = userEvent.setup();
    renderWithProviders(<GuestsPage />, { withAuth: false });
    await screen.findByText("Jose Antonio Silva");

    await user.click(screen.getByRole("button", { name: "Novo hóspede" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cadastrar" }));

    expect(
      await within(dialog).findByText("O nome precisa ter ao menos 3 caracteres."),
    ).toBeInTheDocument();
  });
});

import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";

import { server } from "@/test/msw/server";
import { renderWithProviders, screen, waitFor, within } from "@/test/utils";

import { GuestDetailDialog } from "./guest-detail-dialog";

const API_URL = "http://localhost:8000/api";

const GUEST_DETAIL = {
  id: "g1",
  name: "Jose Antonio Silva",
  document_type: "CPF",
  document: "12345678900",
  phone: "11988887777",
  email: "jose@example.com",
  notes: "",
  current_status: "CHECKED_IN",
  current_reservation: null,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
  reservations: [
    {
      id: "r1",
      code: "R-0001",
      check_in_date: "2026-09-03",
      check_out_date: "2026-09-06",
      room: "204",
      uses_parking: true,
      status: "CHECKED_IN",
    },
  ],
};

function mockGuest(overrides: Record<string, unknown> = {}): void {
  server.use(
    http.get(`${API_URL}/guests/:id/`, () =>
      HttpResponse.json({ ...GUEST_DETAIL, ...overrides }),
    ),
  );
}

async function openDialog() {
  renderWithProviders(<GuestDetailDialog guestId="g1" onOpenChange={() => {}} />, {
    withAuth: false,
  });
  return screen.findByRole("dialog");
}

describe("GuestDetailDialog", () => {
  it("não abre enquanto não há hóspede selecionado", () => {
    renderWithProviders(<GuestDetailDialog guestId={null} onOpenChange={() => {}} />, {
      withAuth: false,
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("mostra o skeleton antes de o hóspede chegar", async () => {
    mockGuest();
    const dialog = await openDialog();

    expect(within(dialog).getByText("Detalhe do hóspede")).toBeInTheDocument();
    expect(dialog.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("carregado, mostra documento, telefone mascarado e e-mail", async () => {
    mockGuest();
    const dialog = await openDialog();

    await waitFor(() =>
      expect(within(dialog).getByText("Jose Antonio Silva")).toBeInTheDocument(),
    );
    expect(within(dialog).getByText("CPF 12345678900")).toBeInTheDocument();
    expect(within(dialog).getByText("(11) 98888-7777")).toBeInTheDocument();
    expect(within(dialog).getByText("jose@example.com")).toBeInTheDocument();
  });

  it("sem e-mail, a linha do e-mail não aparece", async () => {
    mockGuest({ email: "" });
    const dialog = await openDialog();

    await waitFor(() => expect(within(dialog).getByText("Telefone")).toBeInTheDocument());
    expect(within(dialog).queryByText("E-mail")).not.toBeInTheDocument();
  });

  it("lista o histórico de reservas com período, quarto e status", async () => {
    mockGuest();
    const dialog = await openDialog();

    await waitFor(() => expect(within(dialog).getByText("R-0001")).toBeInTheDocument());
    expect(
      within(dialog).getByText("03/09/2026 - 06/09/2026 · Quarto 204"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Hospedado")).toBeInTheDocument();
  });

  it("hóspede sem reservas mostra o estado vazio do histórico", async () => {
    mockGuest({ reservations: [] });
    const dialog = await openDialog();

    await waitFor(() =>
      expect(within(dialog).getByText("Nenhuma reserva ainda")).toBeInTheDocument(),
    );
    expect(
      within(dialog).getByText("Este hóspede ainda não tem reservas registradas."),
    ).toBeInTheDocument();
  });

  it("erro na busca oferece repetir e se recupera", async () => {
    let attempts = 0;
    server.use(
      http.get(`${API_URL}/guests/:id/`, () => {
        attempts += 1;
        if (attempts === 1) {
          return HttpResponse.json(
            { detail: "Erro interno.", code: "server_error" },
            { status: 500 },
          );
        }
        return HttpResponse.json(GUEST_DETAIL);
      }),
    );
    const dialog = await openDialog();

    (await within(dialog).findByRole("button", { name: "Tentar novamente" })).click();

    await waitFor(() =>
      expect(within(dialog).getByText("Jose Antonio Silva")).toBeInTheDocument(),
    );
  });

  it("fechar o dialog avisa o chamador", async () => {
    mockGuest();
    const onOpenChange = vi.fn();
    renderWithProviders(<GuestDetailDialog guestId="g1" onOpenChange={onOpenChange} />, {
      withAuth: false,
    });
    const dialog = await screen.findByRole("dialog");

    within(dialog)
      .getByRole("button", { name: /fechar/i })
      .click();

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});

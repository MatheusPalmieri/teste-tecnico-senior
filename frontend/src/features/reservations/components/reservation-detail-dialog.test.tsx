import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";

import { server } from "@/test/msw/server";
import { renderWithProviders, screen, waitFor, within } from "@/test/utils";

import { ReservationDetailDialog } from "./reservation-detail-dialog";

const API_URL = "http://localhost:8000/api";

const BASE_RESERVATION = {
  id: "r1",
  code: "R-0001",
  guest: {
    id: "g1",
    name: "Jose Antonio Silva",
    document: "12345678900",
    phone: "11988887777",
  },
  status: "RESERVED",
  check_in_date: "2026-09-03",
  check_out_date: "2026-09-06",
  room: "204",
  uses_parking: true,
  vehicle_plate: "",
  notes: "",
  checked_in_at: null,
  checked_out_at: null,
  early_check_in_authorized: false,
  total_amount: null,
  charges_snapshot: null,
  estimated_total: "470.00",
  created_at: "2026-09-01T00:00:00Z",
};

function mockReservation(overrides: Record<string, unknown>): void {
  server.use(
    http.get(`${API_URL}/reservations/:id/`, () =>
      HttpResponse.json({ ...BASE_RESERVATION, ...overrides }),
    ),
  );
}

async function openDialog(reservationId: string | null = "r1") {
  renderWithProviders(
    <ReservationDetailDialog reservationId={reservationId} onOpenChange={() => {}} />,
    { withAuth: false },
  );
  return screen.findByRole("dialog");
}

describe("ReservationDetailDialog", () => {
  it("não abre enquanto não há reserva selecionada", () => {
    renderWithProviders(
      <ReservationDetailDialog reservationId={null} onOpenChange={() => {}} />,
      { withAuth: false },
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("mostra o skeleton antes de a reserva chegar", async () => {
    const dialog = await openDialog();

    expect(within(dialog).getByText("Detalhe da reserva")).toBeInTheDocument();
    expect(dialog.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("carregada, mostra código, hóspede, período e quarto", async () => {
    const dialog = await openDialog();

    await waitFor(() => expect(within(dialog).getByText("R-0001")).toBeInTheDocument());
    expect(within(dialog).getByText("Jose Antonio Silva")).toBeInTheDocument();
    expect(within(dialog).getByText("12345678900")).toBeInTheDocument();
    expect(within(dialog).getByText("03/09/2026 - 06/09/2026")).toBeInTheDocument();
    expect(within(dialog).getByText("204")).toBeInTheDocument();
  });

  it("reserva ainda não iniciada: check-in e check-out ficam pendentes na linha do tempo", async () => {
    const dialog = await openDialog();

    await waitFor(() =>
      expect(within(dialog).getByText("Reserva criada")).toBeInTheDocument(),
    );
    expect(within(dialog).getByText("Check-in")).toBeInTheDocument();
    expect(within(dialog).getByText("Check-out")).toBeInTheDocument();
    expect(within(dialog).queryByText("Cancelada")).not.toBeInTheDocument();
  });

  it("reserva cancelada encerra a linha do tempo, sem passos de check-in/check-out", async () => {
    mockReservation({ status: "CANCELLED" });
    const dialog = await openDialog();

    await waitFor(() => expect(within(dialog).getAllByText("Cancelada")).toHaveLength(2));
    expect(within(dialog).getByText("Reserva criada")).toBeInTheDocument();
    expect(within(dialog).queryByText("Check-in")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Check-out")).not.toBeInTheDocument();
  });

  it("com estadia encerrada, mostra os horários de check-in e check-out", async () => {
    mockReservation({
      status: "CHECKED_OUT",
      checked_in_at: "2026-09-03T17:00:00Z",
      checked_out_at: "2026-09-06T14:30:00Z",
    });
    const dialog = await openDialog();

    await waitFor(() =>
      expect(within(dialog).getAllByText("Check-in").length).toBeGreaterThan(0),
    );
    expect(within(dialog).getAllByText("Check-in")).toHaveLength(2);
    expect(within(dialog).getAllByText("Check-out")).toHaveLength(2);
  });

  it("sem cobranca congelada, exibe o total apenas como estimativa", async () => {
    const dialog = await openDialog();

    await waitFor(() =>
      expect(within(dialog).getByText(/Estimativa:/)).toBeInTheDocument(),
    );
    expect(within(dialog).getByText("R$ 470.00")).toBeInTheDocument();
    expect(within(dialog).queryByText("Total geral")).not.toBeInTheDocument();
  });

  it("com cobrança congelada, exibe o breakdown no lugar da estimativa", async () => {
    mockReservation({
      status: "CHECKED_OUT",
      estimated_total: null,
      total_amount: "510.00",
      charges_snapshot: {
        nights: 3,
        lines: [
          {
            kind: "NIGHTLY",
            day_type: "WEEKDAY",
            description: "Diárias de segunda a sexta",
            quantity: 2,
            unit_amount: "120.00",
            amount: "240.00",
          },
        ],
        nightly_subtotal: "420.00",
        parking_subtotal: "0.00",
        late_check_out_fee: "90.00",
        total: "510.00",
      },
    });
    const dialog = await openDialog();

    await waitFor(() =>
      expect(within(dialog).getByText("Total geral")).toBeInTheDocument(),
    );
    expect(within(dialog).queryByText(/Estimativa:/)).not.toBeInTheDocument();
  });

  it("sem estimativa nem snapshot, não mostra valor nenhum", async () => {
    mockReservation({ estimated_total: null, charges_snapshot: null });
    const dialog = await openDialog();

    await waitFor(() => expect(within(dialog).getByText("R-0001")).toBeInTheDocument());
    expect(within(dialog).queryByText(/Estimativa:/)).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Total geral")).not.toBeInTheDocument();
  });

  it("erro na busca mostra o estado de erro com ação de repetir", async () => {
    let attempts = 0;
    server.use(
      http.get(`${API_URL}/reservations/:id/`, () => {
        attempts += 1;
        if (attempts === 1) {
          return HttpResponse.json(
            { detail: "Erro interno.", code: "server_error" },
            { status: 500 },
          );
        }
        return HttpResponse.json(BASE_RESERVATION);
      }),
    );
    const dialog = await openDialog();

    const retry = await within(dialog).findByRole("button", {
      name: "Tentar novamente",
    });
    retry.click();

    await waitFor(() => expect(within(dialog).getByText("R-0001")).toBeInTheDocument());
  });

  it("fechar o dialog avisa o chamador", async () => {
    const onOpenChange = vi.fn();
    renderWithProviders(
      <ReservationDetailDialog reservationId="r1" onOpenChange={onOpenChange} />,
      { withAuth: false },
    );
    const dialog = await screen.findByRole("dialog");

    within(dialog)
      .getByRole("button", { name: /fechar/i })
      .click();

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});

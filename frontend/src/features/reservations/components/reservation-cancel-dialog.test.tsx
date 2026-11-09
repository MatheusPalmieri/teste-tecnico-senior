import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

import { server } from "@/test/msw/server";
import { renderWithProviders, screen, waitFor } from "@/test/utils";

import { ReservationCancelDialog } from "./reservation-cancel-dialog";

import type { Reservation } from "../api/types";

const API_URL = "http://localhost:8000/api";

const RESERVATION = {
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
} as Reservation;

describe("ReservationCancelDialog", () => {
  it("não abre enquanto não há reserva selecionada", () => {
    renderWithProviders(
      <ReservationCancelDialog reservation={null} onOpenChange={() => {}} />,
      { withAuth: false },
    );

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("deixa claro que cancelar não apaga a reserva", async () => {
    renderWithProviders(
      <ReservationCancelDialog reservation={RESERVATION} onOpenChange={() => {}} />,
      { withAuth: false },
    );

    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    expect(
      screen.getByText("Tem certeza que deseja cancelar a reserva R-0001?"),
    ).toBeInTheDocument();
    expect(screen.getByText(/continua no histórico do hóspede/)).toBeInTheDocument();
  });

  it("confirmada, cancela e fecha o dialog", async () => {
    const user = userEvent.setup();
    const success = vi.spyOn(toast, "success");
    server.use(
      http.post(`${API_URL}/reservations/:id/cancel/`, () =>
        HttpResponse.json({ ...RESERVATION, status: "CANCELLED" }),
      ),
    );
    const onOpenChange = vi.fn();
    renderWithProviders(
      <ReservationCancelDialog reservation={RESERVATION} onOpenChange={onOpenChange} />,
      { withAuth: false },
    );

    await user.click(await screen.findByRole("button", { name: "Cancelar reserva" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(success).toHaveBeenCalledWith("Reserva cancelada.");
    success.mockRestore();
  });

  it("erro do backend vira toast e o dialog continua aberto", async () => {
    const user = userEvent.setup();
    const error = vi.spyOn(toast, "error");
    server.use(
      http.post(`${API_URL}/reservations/:id/cancel/`, () =>
        HttpResponse.json(
          { detail: "Reserva já finalizada.", code: "invalid_transition" },
          { status: 409 },
        ),
      ),
    );
    const onOpenChange = vi.fn();
    renderWithProviders(
      <ReservationCancelDialog reservation={RESERVATION} onOpenChange={onOpenChange} />,
      { withAuth: false },
    );

    await user.click(await screen.findByRole("button", { name: "Cancelar reserva" }));

    await waitFor(() => expect(error).toHaveBeenCalledWith("Reserva já finalizada."));
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    error.mockRestore();
  });
});

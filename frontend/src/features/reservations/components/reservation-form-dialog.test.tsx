import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { server } from "@/test/msw/server";
import { act, renderWithProviders, screen, waitFor, within } from "@/test/utils";

import { ReservationFormDialog } from "./reservation-form-dialog";

import type { Reservation } from "../api/types";

const API_URL = "http://localhost:8000/api";

const reservation = {
  id: "r1",
  code: "R-0001",
  status: "RESERVED",
  guest: { id: "g1", name: "Ana Souza", document: "52998224725", phone: "11988887777" },
  room: "101",
  check_in_date: "2099-09-03",
  check_out_date: "2099-09-06",
  uses_parking: true,
  notes: "",
} as Reservation;

describe("ReservationFormDialog", () => {
  it("mostra a estimativa devolvida pelo POST /quote para o período escolhido", async () => {
    let quoteBody: unknown;
    server.use(
      http.post(`${API_URL}/reservations/quote/`, async ({ request }) => {
        quoteBody = await request.json();
        return HttpResponse.json({
          nights: 3,
          lines: [],
          nightly_subtotal: "420.00",
          parking_subtotal: "50.00",
          late_check_out_fee: "0.00",
          total: "987.65",
        });
      }),
    );
    renderWithProviders(
      <ReservationFormDialog open onOpenChange={() => {}} reservation={reservation} />,
      { withAuth: false },
    );

    const dialog = await screen.findByRole("dialog");
    expect(
      await within(dialog).findByText("R$ 987,65", {}, { timeout: 2000 }),
    ).toBeInTheDocument();
    expect(quoteBody).toEqual({
      check_in_date: "2099-09-03",
      check_out_date: "2099-09-06",
      uses_parking: true,
    });
  });

  it("não mostra estimativa enquanto o período está incompleto", async () => {
    let quoteCalls = 0;
    server.use(
      http.post(`${API_URL}/reservations/quote/`, () => {
        quoteCalls += 1;
        return HttpResponse.json({});
      }),
    );
    renderWithProviders(<ReservationFormDialog open onOpenChange={() => {}} />, {
      withAuth: false,
    });

    const dialog = await screen.findByRole("dialog");
    await act(() => new Promise((resolve) => setTimeout(resolve, 400)));
    await waitFor(() =>
      expect(within(dialog).queryByText("Total geral")).not.toBeInTheDocument(),
    );
    expect(quoteCalls).toBe(0);
  });
});

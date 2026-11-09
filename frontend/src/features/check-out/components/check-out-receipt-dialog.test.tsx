import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Reservation } from "@/features/reservations";
import { renderWithProviders, screen } from "@/test/utils";

import { CheckOutReceiptDialog } from "./check-out-receipt-dialog";

const reservation = {
  id: "r2",
  code: "R-0002",
  room: "101",
  guest: {
    id: "g1",
    name: "Jose Antonio Silva",
    document: "52998224725",
    phone: "11988887777",
  },
  charges_snapshot: {
    nights: 1,
    lines: [],
    nightly_subtotal: "120.00",
    parking_subtotal: "0.00",
    late_check_out_fee: "0.00",
    total: "120.00",
  },
} as unknown as Reservation;

describe("CheckOutReceiptDialog", () => {
  it("o botão Imprimir abre a impressão do navegador", async () => {
    const print = vi.fn();
    vi.stubGlobal("print", print);
    const user = userEvent.setup();
    renderWithProviders(
      <CheckOutReceiptDialog reservation={reservation} onOpenChange={() => {}} />,
      {
        withAuth: false,
      },
    );

    await user.click(await screen.findByRole("button", { name: /Imprimir/ }));

    expect(print).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});

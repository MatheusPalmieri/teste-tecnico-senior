import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders, screen } from "@/test/utils";

import { ReservationRowActions } from "./reservation-row-actions";

import type { ReservationStatus } from "@/shared/ui/status-badge";

import type { Reservation } from "../api/types";

function reservationWith(status: ReservationStatus): Reservation {
  return {
    id: "r1",
    status,
    guest: { id: "g1", name: "Ana Souza", document: "52998224725", phone: "11988887777" },
  } as Reservation;
}

async function openMenu(status: ReservationStatus) {
  const handlers = {
    onView: vi.fn(),
    onEdit: vi.fn(),
    onCancel: vi.fn(),
    onCheckIn: vi.fn(),
    onCheckOut: vi.fn(),
  };
  const user = userEvent.setup();
  renderWithProviders(
    <ReservationRowActions reservation={reservationWith(status)} {...handlers} />,
    {
      withAuth: false,
    },
  );
  await user.click(screen.getByRole("button", { name: "Ações da reserva de Ana Souza" }));
  return { user, handlers };
}

function menuItems(): string[] {
  return screen.getAllByRole("menuitem").map((item) => item.textContent ?? "");
}

describe("ReservationRowActions", () => {
  it("reserva aguardando pode ser vista, editada, ter check-in ou ser cancelada — nunca check-out", async () => {
    await openMenu("RESERVED");
    expect(menuItems()).toEqual([
      "Ver reserva",
      "Editar reserva",
      "Fazer check-in",
      "Cancelar reserva",
    ]);
  });

  it("hóspede no hotel só pode ser visto ou fazer check-out", async () => {
    await openMenu("CHECKED_IN");
    expect(menuItems()).toEqual(["Ver reserva", "Fazer check-out"]);
  });

  it.each(["CHECKED_OUT", "CANCELLED"] as const)(
    "a %s stay is read-only",
    async (status) => {
      await openMenu(status);
      expect(menuItems()).toEqual(["Ver reserva"]);
    },
  );

  it("cada item chama seu handler com a reserva", async () => {
    const { user, handlers } = await openMenu("RESERVED");
    await user.click(screen.getByRole("menuitem", { name: "Fazer check-in" }));
    expect(handlers.onCheckIn).toHaveBeenCalledWith(
      expect.objectContaining({ id: "r1" }),
    );
  });

  it("check-out chama seu handler", async () => {
    const { user, handlers } = await openMenu("CHECKED_IN");
    await user.click(screen.getByRole("menuitem", { name: "Fazer check-out" }));
    expect(handlers.onCheckOut).toHaveBeenCalledWith(
      expect.objectContaining({ id: "r1" }),
    );
  });

  it.each([
    ["Ver reserva", "onView"],
    ["Editar reserva", "onEdit"],
    ["Cancelar reserva", "onCancel"],
  ] as const)("%s calls %s", async (label, handler) => {
    const { user, handlers } = await openMenu("RESERVED");
    await user.click(screen.getByRole("menuitem", { name: label }));
    expect(handlers[handler]).toHaveBeenCalledTimes(1);
  });
});

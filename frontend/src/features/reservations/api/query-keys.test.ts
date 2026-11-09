import { describe, expect, it } from "vitest";

import { reservationKeys } from "./query-keys";

describe("reservationKeys", () => {
  it("toda chave descende de `all`, nunca e string solta", () => {
    expect(reservationKeys.list({ page: 1 } as never)).toEqual([
      "reservations",
      "list",
      { page: 1 },
    ]);
    expect(reservationKeys.detail("r1")).toEqual(["reservations", "detail", "r1"]);
    expect(
      reservationKeys.quote({
        checkInDate: "2026-09-03",
        checkOutDate: "2026-09-06",
        usesParking: true,
      }),
    ).toEqual([
      "reservations",
      "quote",
      { checkInDate: "2026-09-03", checkOutDate: "2026-09-06", usesParking: true },
    ]);
  });

  it("invalidar `all` derruba listas, detalhes e a estimativa de uma vez", () => {
    const list = reservationKeys.list({ page: 1 } as never);
    const quote = reservationKeys.quote({
      checkInDate: "2026-09-03",
      checkOutDate: "2026-09-06",
      usesParking: false,
    });

    expect(list.slice(0, 1)).toEqual(reservationKeys.all);
    expect(quote.slice(0, 1)).toEqual(reservationKeys.all);
  });
});

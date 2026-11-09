import { describe, expect, it } from "vitest";

import { reservationSchema } from "./reservation-schema";

const VALID = {
  guest_id: "g1",
  room: "101",
  check_in_date: "2026-09-03",
  check_out_date: "2026-09-06",
  uses_parking: false,
};

describe("reservationSchema", () => {
  it("aceita saída depois da entrada", () => {
    expect(reservationSchema.safeParse(VALID).success).toBe(true);
  });

  it.each(["2026-09-03", "2026-09-02"])(
    "recusa saída em %s, no dia da entrada ou antes, no campo de saída",
    (checkOut) => {
      const result = reservationSchema.safeParse({ ...VALID, check_out_date: checkOut });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path).toEqual(["check_out_date"]);
    },
  );
});

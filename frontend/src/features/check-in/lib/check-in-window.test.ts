import { describe, expect, it } from "vitest";

import { isCheckInAllowed } from "./check-in-window";

describe("isCheckInAllowed", () => {
  it("is false at 13:59 in São Paulo", () => {
    expect(isCheckInAllowed(new Date("2026-09-03T13:59:00-03:00"))).toBe(false);
  });

  it("is true from 14:00 in São Paulo", () => {
    expect(isCheckInAllowed(new Date("2026-09-03T14:00:00-03:00"))).toBe(true);
  });

  it("usa o fuso do hotel, não UTC", () => {
    expect(isCheckInAllowed(new Date("2026-09-03T16:30:00Z"))).toBe(false);
  });
});

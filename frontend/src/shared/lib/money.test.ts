import { describe, expect, it } from "vitest";

import { formatMoney } from "./money";

describe("formatMoney", () => {
  it("formata string decimal em real brasileiro", () => {
    expect(formatMoney("120.00")).toBe("R$ 120,00");
  });

  it("preserva duas casas decimais mesmo com valores quebrados", () => {
    expect(formatMoney("15.50")).toBe("R$ 15,50");
  });
});

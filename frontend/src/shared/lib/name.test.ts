import { describe, expect, it } from "vitest";

import { initialsFromName } from "./name";

describe("initialsFromName", () => {
  it("usa a inicial do primeiro e do último nome, em caixa alta", () => {
    expect(initialsFromName("Jose Antonio Silva")).toBe("JS");
    expect(initialsFromName("maria fernanda")).toBe("MF");
  });

  it("com um nome só, devolve uma única inicial", () => {
    expect(initialsFromName("Atendente")).toBe("A");
  });

  it("ignora espaços extras em volta e no meio", () => {
    expect(initialsFromName("  Ana   Paula  ")).toBe("AP");
  });

  it("devolve `?` quando não há nome", () => {
    expect(initialsFromName(undefined)).toBe("?");
    expect(initialsFromName("")).toBe("?");
  });
});

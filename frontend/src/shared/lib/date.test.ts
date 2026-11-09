import { describe, expect, it } from "vitest";

import { formatDate, formatDateTime, formatLongDate, formatTime } from "./date";

describe("formatDate", () => {
  it("preserva o dia de uma data pura, sem deslocar pelo fuso", () => {
    expect(formatDate("2026-09-05")).toBe("05/09/2026");
    expect(formatDate("2026-01-01")).toBe("01/01/2026");
    expect(formatDate("2026-03-01")).toBe("01/03/2026");
  });

  it("converte instante ISO para o fuso America/Sao_Paulo", () => {
    expect(formatDate("2026-09-05T02:00:00Z")).toBe("04/09/2026");
    expect(formatDate("2026-09-05T14:00:00Z")).toBe("05/09/2026");
  });

  it("devolve string vazia para valor inválido", () => {
    expect(formatDate("não é data")).toBe("");
  });
});

describe("formatLongDate", () => {
  it("preserva o dia de uma data pura", () => {
    expect(formatLongDate("2026-09-05")).toBe("Sábado, 5 de setembro de 2026");
  });
});

describe("formatDateTime", () => {
  it("converte instante ISO para o fuso America/Sao_Paulo", () => {
    expect(formatDateTime("2026-09-05T17:30:00Z")).toBe("05/09/2026, 14:30");
  });
});

describe("formatTime", () => {
  it("converte instante ISO para o fuso America/Sao_Paulo", () => {
    expect(formatTime("2026-09-05T17:30:00Z")).toBe("14:30");
  });
});

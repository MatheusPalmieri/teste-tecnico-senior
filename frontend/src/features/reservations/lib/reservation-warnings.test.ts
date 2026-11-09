import { describe, expect, it } from "vitest";

import {
  formatReservationWarning,
  reservationWarningMessages,
} from "./reservation-warnings";

import type { ReservationMutationResult } from "../api/types";

function resultWith(
  warnings: ReservationMutationResult["warnings"],
): ReservationMutationResult {
  return { warnings } as ReservationMutationResult;
}

describe("reservation warnings", () => {
  it("cita a reserva conflitante na mensagem", () => {
    const message = formatReservationWarning({
      code: "reservation_overlaps",
      detail: "Este hóspede já possui outra reserva ativa neste período.",
      context: { conflicting_reservation: "R-0002" },
    });

    expect(message).toBe(
      "Este hóspede já possui outra reserva ativa neste período. (R-0002)",
    );
  });

  it("usa o `detail` puro quando não há código conflitante", () => {
    const message = formatReservationWarning({
      code: "reservation_overlaps",
      detail: "Aviso sem contexto.",
      context: {},
    });

    expect(message).toBe("Aviso sem contexto.");
  });

  it("não gera mensagem quando a escrita não teve avisos", () => {
    expect(reservationWarningMessages(resultWith([]))).toEqual([]);
  });

  it("produces one message per warning", () => {
    const messages = reservationWarningMessages(
      resultWith([
        {
          code: "reservation_overlaps",
          detail: "Sobreposicao.",
          context: { conflicting_reservation: "R-0002" },
        },
      ]),
    );

    expect(messages).toEqual(["Sobreposicao. (R-0002)"]);
  });
});

import { describe, expect, it } from "vitest";

import { render, screen } from "@/test/utils";

import { ChargesBreakdown } from "./charges-breakdown";

import type { Breakdown } from "../api/types";

const CANONICAL_BREAKDOWN: Breakdown = {
  nights: 3,
  lines: [
    {
      kind: "NIGHTLY",
      day_type: "WEEKDAY",
      description: "Diárias de segunda a sexta",
      quantity: 2,
      unit_amount: "120.00",
      amount: "240.00",
    },
    {
      kind: "NIGHTLY",
      day_type: "WEEKEND",
      description: "Diárias de sábado e domingo",
      quantity: 1,
      unit_amount: "180.00",
      amount: "180.00",
    },
    {
      kind: "PARKING",
      day_type: "WEEKDAY",
      description: "Vaga de garagem - segunda a sexta",
      quantity: 2,
      unit_amount: "15.00",
      amount: "30.00",
    },
    {
      kind: "PARKING",
      day_type: "WEEKEND",
      description: "Vaga de garagem — sábado e domingo",
      quantity: 1,
      unit_amount: "20.00",
      amount: "20.00",
    },
  ],
  nightly_subtotal: "420.00",
  parking_subtotal: "50.00",
  late_check_out_fee: "0.00",
  total: "470.00",
};

describe("ChargesBreakdown", () => {
  it("mostra todas as linhas, os subtotais e o total", () => {
    render(<ChargesBreakdown breakdown={CANONICAL_BREAKDOWN} />);

    expect(screen.getByText("Diárias de segunda a sexta")).toBeInTheDocument();
    expect(screen.getByText("Diárias de sábado e domingo")).toBeInTheDocument();
    expect(screen.getByText("Subtotal de vaga")).toBeInTheDocument();
    expect(screen.getByText("Total geral")).toBeInTheDocument();
    expect(screen.getByText("R$ 470,00")).toBeInTheDocument();
  });

  it("omite o subtotal de vaga quando não há cobrança de vaga", () => {
    render(
      <ChargesBreakdown
        breakdown={{
          ...CANONICAL_BREAKDOWN,
          lines: CANONICAL_BREAKDOWN.lines.slice(0, 2),
          parking_subtotal: "0.00",
        }}
      />,
    );
    expect(screen.queryByText("Subtotal de vaga")).not.toBeInTheDocument();
  });

  it("omite a linha de late check-out quando não há multa", () => {
    render(<ChargesBreakdown breakdown={CANONICAL_BREAKDOWN} />);
    expect(screen.queryByText("Multa de late check-out")).not.toBeInTheDocument();
  });
});

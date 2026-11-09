import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DatePicker } from "./date-picker";

function dayCell(iso: string): HTMLElement {
  const cell = document.querySelector<HTMLElement>(`[data-day="${iso}"]`);
  if (!cell) throw new Error(`Dia ${iso} nao esta no calendario`);
  return cell;
}

describe("DatePicker", () => {
  it("desabilita dias fora do intervalo `minDate`/`maxDate`", () => {
    render(
      <DatePicker
        value="2026-09-10"
        minDate="2026-09-05"
        maxDate="2026-09-15"
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "10/09/2026" }));

    expect(dayCell("2026-09-04")).toHaveAttribute("data-disabled", "true");
    expect(dayCell("2026-09-05")).not.toHaveAttribute("data-disabled");
    expect(dayCell("2026-09-15")).not.toHaveAttribute("data-disabled");
    expect(dayCell("2026-09-16")).toHaveAttribute("data-disabled", "true");
  });

  it("emite a data escolhida em ISO local, sem deslocamento de fuso", () => {
    const onChange = vi.fn();
    render(<DatePicker value="2026-09-10" minDate="2026-09-05" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "10/09/2026" }));
    fireEvent.click(dayCell("2026-09-07").querySelector("button") as HTMLButtonElement);

    expect(onChange).toHaveBeenCalledWith("2026-09-07");
  });
});

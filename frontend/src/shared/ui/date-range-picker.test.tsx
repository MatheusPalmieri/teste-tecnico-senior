import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DateRangePicker } from "./date-range-picker";

function dayButton(iso: string): HTMLButtonElement {
  const cell = document.querySelector<HTMLElement>(`[data-day="${iso}"]`);
  if (!cell) throw new Error(`Dia ${iso} nao esta no calendario`);
  return cell.querySelector("button") as HTMLButtonElement;
}

function chipTrigger(): HTMLElement {
  return screen.getAllByRole("button")[0] as HTMLElement;
}

function openPicker(): void {
  fireEvent.click(chipTrigger());
}

describe("DateRangePicker", () => {
  it("sem período escolhido, o chip mostra só o rótulo da dimensão", () => {
    render(<DateRangePicker from="" to="" onChange={vi.fn()} />);

    expect(chipTrigger()).toHaveTextContent("Período");
    expect(chipTrigger()).not.toHaveTextContent("/");
  });

  it("com o período aplicado, o chip escreve as duas datas", () => {
    render(<DateRangePicker from="2026-09-03" to="2026-09-06" onChange={vi.fn()} />);

    expect(chipTrigger()).toHaveTextContent("03/09/2026 - 06/09/2026");
  });

  it.each([
    ["só a data inicial", "2026-09-03", "", "03/09/2026 - ..."],
    ["só a data final", "", "2026-09-06", "... - 06/09/2026"],
  ])("com %s, a ponta faltante aparece como reticencias", (_case, from, to, label) => {
    render(<DateRangePicker from={from} to={to} onChange={vi.fn()} />);

    expect(chipTrigger()).toHaveTextContent(label);
  });

  it("aberto, repete o rótulo do filtro e o período corrente", () => {
    render(
      <DateRangePicker
        from="2026-09-03"
        to="2026-09-06"
        onChange={vi.fn()}
        label="Estadia"
      />,
    );

    openPicker();

    expect(screen.getAllByText("Estadia").length).toBeGreaterThan(0);
    expect(screen.getAllByText("03/09/2026 - 06/09/2026").length).toBeGreaterThan(0);
  });

  it("sem período, o resumo aberto diz que não há data", () => {
    render(<DateRangePicker from="" to="" onChange={vi.fn()} />);

    openPicker();

    expect(screen.getByText("Nenhuma data")).toBeInTheDocument();
  });

  it("escolher um dia devolve ISO local, sem deslocamento de fuso", () => {
    const onChange = vi.fn();
    render(<DateRangePicker from="2026-09-03" to="2026-09-06" onChange={onChange} />);

    openPicker();
    fireEvent.click(dayButton("2026-09-10"));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ from: expect.stringMatching(/^2026-09-\d{2}$/) }),
    );
  });

  it("limpar pelo popover zera as duas pontas do período", () => {
    const onChange = vi.fn();
    render(<DateRangePicker from="2026-09-03" to="2026-09-06" onChange={onChange} />);

    openPicker();
    fireEvent.click(screen.getByRole("button", { name: "Limpar período" }));

    expect(onChange).toHaveBeenCalledWith({ from: "", to: "" });
  });

  it("sem período, não há o que limpar", () => {
    render(<DateRangePicker from="" to="" onChange={vi.fn()} />);

    openPicker();

    expect(screen.getByRole("button", { name: "Limpar período" })).toBeDisabled();
  });

  it("data mal formada na URL não quebra o calendário", () => {
    render(<DateRangePicker from="rabiscos" to="" onChange={vi.fn()} />);

    openPicker();

    expect(screen.getAllByRole("grid").length).toBeGreaterThan(0);
    expect(document.querySelectorAll("[data-selected=true]")).toHaveLength(0);
  });
});

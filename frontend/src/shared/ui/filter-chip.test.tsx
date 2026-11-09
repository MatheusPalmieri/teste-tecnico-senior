import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { FilterChipMultiSelect, FilterChipSelect } from "./filter-chip";

const STATUS_OPTIONS = [
  { value: "RESERVED", label: "Reservada" },
  { value: "CHECKED_IN", label: "Hospedado" },
] as const;

const PARKING_OPTIONS = [
  { value: "1", label: "Usa vaga" },
  { value: "0", label: "Não usa" },
] as const;

type Status = (typeof STATUS_OPTIONS)[number]["value"];

function StatusChip({ onChange }: { onChange?: (value: Status[]) => void }) {
  const [value, setValue] = useState<Status[]>([]);
  return (
    <FilterChipMultiSelect
      label="Status"
      options={STATUS_OPTIONS}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

const statusChip = (): HTMLElement => screen.getByRole("button", { name: /^status/i });
const clearButton = (label: string): HTMLElement =>
  screen.getByRole("button", { name: `Remover filtro ${label}` });

function pressEscape(): void {
  fireEvent.keyDown(document.activeElement ?? document.body, {
    key: "Escape",
    code: "Escape",
  });
}

describe("FilterChip", () => {
  it("sem filtro o chip não se anuncia como ativo nem oferece limpar", () => {
    render(<StatusChip />);

    expect(statusChip()).toHaveAccessibleName("Status");
    expect(
      screen.queryByRole("button", { name: "Remover filtro Status" }),
    ).not.toBeInTheDocument();
  });

  it("marcar uma opção ativa o chip na hora, sem botão de aplicar", () => {
    const onChange = vi.fn();
    render(<StatusChip onChange={onChange} />);

    fireEvent.click(statusChip());
    fireEvent.click(screen.getByRole("checkbox", { name: "Reservada" }));

    expect(onChange).toHaveBeenCalledWith(["RESERVED"]);
    expect(screen.queryByRole("button", { name: /aplicar/i })).not.toBeInTheDocument();
    expect(statusChip()).toHaveAccessibleName("Status : Reservada");
    expect(clearButton("Status")).toBeInTheDocument();
  });

  it("marcar duas opções envia as duas no `onChange`", () => {
    const onChange = vi.fn();
    render(<StatusChip onChange={onChange} />);

    fireEvent.click(statusChip());
    fireEvent.click(screen.getByRole("checkbox", { name: "Reservada" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Hospedado" }));

    expect(onChange).toHaveBeenLastCalledWith(["RESERVED", "CHECKED_IN"]);
    expect(statusChip()).toHaveAccessibleName("Status : Reservada +1");
  });

  it("o `x` limpa só a dimensão daquele chip, sem abrir o popover", () => {
    const onParkingChange = vi.fn();
    render(
      <>
        <StatusChip />
        <FilterChipSelect
          label="Estacionamento"
          options={PARKING_OPTIONS}
          value="1"
          onChange={onParkingChange}
        />
      </>,
    );

    fireEvent.click(statusChip());
    fireEvent.click(screen.getByRole("checkbox", { name: "Reservada" }));
    pressEscape();

    fireEvent.click(clearButton("Estacionamento"));

    expect(onParkingChange).toHaveBeenCalledTimes(1);
    expect(onParkingChange).toHaveBeenCalledWith("");
    expect(statusChip()).toHaveAccessibleName("Status : Reservada");
    expect(screen.queryByRole("button", { name: "Usa vaga" })).not.toBeInTheDocument();
  });

  it("`Esc` fecha o popover do chip", () => {
    render(<StatusChip />);

    statusChip().focus();
    fireEvent.click(statusChip());
    expect(screen.getByRole("checkbox", { name: "Reservada" })).toBeInTheDocument();

    pressEscape();

    expect(screen.queryByRole("checkbox", { name: "Reservada" })).not.toBeInTheDocument();
    expect(statusChip()).toHaveAttribute("aria-expanded", "false");
  });

  it("a escolha única desmarca ao clicar na opção já aplicada", () => {
    const onChange = vi.fn();
    render(
      <FilterChipSelect
        label="Estacionamento"
        options={PARKING_OPTIONS}
        value="1"
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^estacionamento/i }));
    fireEvent.click(screen.getByRole("button", { name: "Usa vaga" }));

    expect(onChange).toHaveBeenCalledWith("");
  });
});

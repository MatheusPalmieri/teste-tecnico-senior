import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SearchInput } from "./search-input";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

function type(value: string): void {
  fireEvent.change(screen.getByRole("searchbox"), { target: { value } });
}

describe("SearchInput", () => {
  it("mostra o valor recebido e não oferece limpar quando esta vazio", () => {
    render(<SearchInput value="" onChange={vi.fn()} placeholder="Buscar" />);

    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(
      screen.queryByRole("button", { name: "Limpar busca" }),
    ).not.toBeInTheDocument();
  });

  it("o texto digitado aparece na hora, mas só vira busca depois do debounce", () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} />);

    type("mar");

    expect(screen.getByRole("searchbox")).toHaveValue("mar");
    expect(onChange).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(300));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("mar");
  });

  it("digitação continua reinicia o debounce — uma busca só, com o texto final", () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} />);

    type("m");
    act(() => vi.advanceTimersByTime(200));
    type("ma");
    act(() => vi.advanceTimersByTime(200));
    type("mar");
    act(() => vi.advanceTimersByTime(300));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("mar");
  });

  it("respeita um `debounceMs` próprio", () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} debounceMs={800} />);

    type("mar");
    act(() => vi.advanceTimersByTime(300));
    expect(onChange).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(500));
    expect(onChange).toHaveBeenCalledWith("mar");
  });

  it("limpar zera o campo na hora, sem esperar o debounce", () => {
    const onChange = vi.fn();
    render(<SearchInput value="maria" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Limpar busca" }));

    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("limpar cancela a busca pendente — não dispara o texto antigo depois", () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} />);

    type("mar");
    fireEvent.click(screen.getByRole("button", { name: "Limpar busca" }));
    act(() => vi.advanceTimersByTime(300));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("valor vindo de fora (ex.: URL) sobrescreve o rascunho", () => {
    const { rerender } = render(<SearchInput value="" onChange={vi.fn()} />);

    type("mar");
    rerender(<SearchInput value="lucia" onChange={vi.fn()} />);

    expect(screen.getByRole("searchbox")).toHaveValue("lucia");
  });
});

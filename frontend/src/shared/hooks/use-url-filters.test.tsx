import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { useUrlFilters } from "./use-url-filters";

const filterSchema = z.object({
  search: z.string().default(""),
  status: z.array(z.string()).default([]),
  page: z.coerce.number().int().min(1).default(1),
});

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter initialEntries={["/hospedes"]}>{children}</MemoryRouter>;
}

describe("useUrlFilters", () => {
  it("começa com os defaults do schema quando a URL esta vazia", () => {
    const { result } = renderHook(() => useUrlFilters(filterSchema), { wrapper });
    expect(result.current.filters).toEqual({ search: "", status: [], page: 1 });
  });

  it("escreve o filtro na query string", () => {
    const { result } = renderHook(() => useUrlFilters(filterSchema), { wrapper });

    act(() => result.current.setFilter("search", "maria"));

    expect(result.current.filters.search).toBe("maria");
  });

  it("mudar um filtro reseta a página para 1", () => {
    const { result } = renderHook(() => useUrlFilters(filterSchema), { wrapper });

    act(() => result.current.setFilter("page", 3));
    expect(result.current.filters.page).toBe(3);

    act(() => result.current.setFilter("search", "joao"));
    expect(result.current.filters.page).toBe(1);
  });

  it("setFilters escreve várias chaves de uma vez, no mesmo evento", () => {
    const { result } = renderHook(() => useUrlFilters(filterSchema), { wrapper });

    act(() => result.current.setFilters({ search: "maria", status: ["RESERVED"] }));

    expect(result.current.filters.search).toBe("maria");
    expect(result.current.filters.status).toEqual(["RESERVED"]);
    expect(result.current.filters.page).toBe(1);
  });

  it("activeChips reflete apenas campos fora do default", () => {
    const { result } = renderHook(() => useUrlFilters(filterSchema), { wrapper });

    act(() => result.current.setFilter("status", ["RESERVED", "CHECKED_IN"]));

    expect(result.current.activeChips).toEqual([
      { key: "status", value: ["RESERVED", "CHECKED_IN"] },
    ]);
  });

  it("clearFilter volta um campo ao default sem afetar os outros", () => {
    const { result } = renderHook(() => useUrlFilters(filterSchema), { wrapper });

    act(() => result.current.setFilter("search", "maria"));
    act(() => result.current.setFilter("status", ["RESERVED"]));
    act(() => result.current.clearFilter("status"));

    expect(result.current.filters.status).toEqual([]);
    expect(result.current.filters.search).toBe("maria");
  });

  it("clearAll zera todos os filtros", () => {
    const { result } = renderHook(() => useUrlFilters(filterSchema), { wrapper });

    act(() => {
      result.current.setFilter("search", "maria");
      result.current.setFilter("status", ["RESERVED"]);
    });
    act(() => result.current.clearAll());

    expect(result.current.filters).toEqual({ search: "", status: [], page: 1 });
    expect(result.current.activeChips).toEqual([]);
  });
});

describe("useUrlFilters — URL inválida cai no default", () => {
  function invalidWrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={["/hospedes?page=abc"]}>{children}</MemoryRouter>
    );
  }

  it("não quebra a tela quando a query string e inválida", () => {
    const { result } = renderHook(() => useUrlFilters(filterSchema), {
      wrapper: invalidWrapper,
    });
    expect(result.current.filters).toEqual({ search: "", status: [], page: 1 });
  });
});

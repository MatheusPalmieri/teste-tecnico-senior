import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { reservationsApi } from "../api/reservations-api";
import { useQuote } from "./use-quote";

vi.mock("../api/reservations-api", () => ({
  reservationsApi: { quote: vi.fn() },
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useQuote", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("não dispara a query antes de datas válidas (debounce de 300ms)", () => {
    renderHook(
      () => useQuote({ checkInDate: "", checkOutDate: "", usesParking: false }),
      {
        wrapper,
      },
    );
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(reservationsApi.quote).not.toHaveBeenCalled();
  });

  it("data de saída anterior a de entrada também não dispara a query", () => {
    renderHook(
      () =>
        useQuote({
          checkInDate: "2026-09-06",
          checkOutDate: "2026-09-03",
          usesParking: false,
        }),
      { wrapper },
    );
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(reservationsApi.quote).not.toHaveBeenCalled();
  });

  it("com datas válidas, espera o debounce e busca a estimativa", async () => {
    vi.mocked(reservationsApi.quote).mockResolvedValue({
      total: "470.00",
    } as never);

    const { result } = renderHook(
      () =>
        useQuote({
          checkInDate: "2026-09-03",
          checkOutDate: "2026-09-06",
          usesParking: true,
        }),
      { wrapper },
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });
    vi.useRealTimers();

    await waitFor(() => expect(result.current.data).toEqual({ total: "470.00" }));
    expect(reservationsApi.quote).toHaveBeenCalledWith({
      check_in_date: "2026-09-03",
      check_out_date: "2026-09-06",
      uses_parking: true,
    });
  });
});

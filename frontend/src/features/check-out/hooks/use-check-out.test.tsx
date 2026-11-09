import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { dashboardKeys } from "@/features/dashboard";
import { guestKeys } from "@/features/guests";
import { reservationKeys } from "@/features/reservations";

import { checkOutApi } from "../api/check-out-api";
import { checkOutKeys } from "../api/query-keys";
import { useCheckOut } from "./use-check-out";

vi.mock("../api/check-out-api", () => ({
  checkOutApi: { checkOut: vi.fn() },
}));

describe("useCheckOut", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.mocked(checkOutApi.checkOut).mockResolvedValue({ id: "r1" } as never);
  });

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  it("invalida as quatro visões afetadas pelo check-out", async () => {
    const spy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useCheckOut("r1"), { wrapper });

    result.current.mutate({ expectedTotal: "470.00" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const invalidated = spy.mock.calls.map((call) => call[0]?.queryKey);
    expect(invalidated).toContainEqual(checkOutKeys.all);
    expect(invalidated).toContainEqual(reservationKeys.all);
    expect(invalidated).toContainEqual(guestKeys.all);
    expect(invalidated).toContainEqual(dashboardKeys.all);
  });

  it("envia o total exibido para o backend conferir", async () => {
    const { result } = renderHook(() => useCheckOut("r1"), { wrapper });

    result.current.mutate({ expectedTotal: "470.00" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(checkOutApi.checkOut).toHaveBeenCalledWith("r1", { expectedTotal: "470.00" });
  });
});

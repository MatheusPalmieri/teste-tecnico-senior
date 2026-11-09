import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { dashboardKeys } from "@/features/dashboard";
import { guestKeys } from "@/features/guests";
import { reservationKeys } from "@/features/reservations";

import { checkInApi } from "../api/check-in-api";
import { checkInKeys } from "../api/query-keys";
import { useCheckIn } from "./use-check-in";

vi.mock("../api/check-in-api", () => ({
  checkInApi: { checkIn: vi.fn() },
}));

describe("useCheckIn", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.mocked(checkInApi.checkIn).mockResolvedValue({ id: "r1" } as never);
  });

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  it("invalida as quatro visões afetadas pelo check-in", async () => {
    const spy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useCheckIn("r1"), { wrapper });

    result.current.mutate({ authorize_early: false });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const invalidated = spy.mock.calls.map((call) => call[0]?.queryKey);
    expect(invalidated).toContainEqual(checkInKeys.all);
    expect(invalidated).toContainEqual(reservationKeys.all);
    expect(invalidated).toContainEqual(guestKeys.all);
    expect(invalidated).toContainEqual(dashboardKeys.all);
  });

  it("não atualiza nenhuma lista otimisticamente", async () => {
    const setQueryDataSpy = vi.spyOn(queryClient, "setQueryData");
    const { result } = renderHook(() => useCheckIn("r1"), { wrapper });

    result.current.mutate({ authorize_early: false });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(setQueryDataSpy).not.toHaveBeenCalled();
  });
});

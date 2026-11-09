import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { dashboardKeys } from "@/features/dashboard";

import { guestsApi } from "../api/guests-api";
import { guestKeys } from "../api/query-keys";
import { useCreateGuest, useDeleteGuest, useUpdateGuest } from "./use-guest-mutations";

vi.mock("../api/guests-api", () => ({
  guestsApi: { create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));

function wrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("Guest mutations — matriz de invalidação", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.mocked(guestsApi.create).mockResolvedValue({ id: "g1" } as never);
    vi.mocked(guestsApi.update).mockResolvedValue({ id: "g1" } as never);
    vi.mocked(guestsApi.remove).mockResolvedValue(undefined as never);
  });

  it("criar hóspede inválida guestKeys e dashboardKeys", async () => {
    const spy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useCreateGuest(), {
      wrapper: wrapper(queryClient),
    });

    result.current.mutate({} as never);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const invalidated = spy.mock.calls.map((call) => call[0]?.queryKey);
    expect(invalidated).toContainEqual(guestKeys.all);
    expect(invalidated).toContainEqual(dashboardKeys.all);
  });

  it("excluir hóspede inválida guestKeys e dashboardKeys", async () => {
    const spy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useDeleteGuest(), {
      wrapper: wrapper(queryClient),
    });

    result.current.mutate("g1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const invalidated = spy.mock.calls.map((call) => call[0]?.queryKey);
    expect(invalidated).toContainEqual(guestKeys.all);
    expect(invalidated).toContainEqual(dashboardKeys.all);
  });

  it("editar hóspede inválida guestKeys e dashboardKeys", async () => {
    const spy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useUpdateGuest("g1"), {
      wrapper: wrapper(queryClient),
    });

    result.current.mutate({} as never);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const invalidated = spy.mock.calls.map((call) => call[0]?.queryKey);
    expect(invalidated).toContainEqual(guestKeys.all);
  });
});

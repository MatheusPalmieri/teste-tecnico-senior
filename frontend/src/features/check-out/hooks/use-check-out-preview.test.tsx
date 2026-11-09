import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { checkOutApi } from "../api/check-out-api";
import { useCheckOutPreview } from "./use-check-out-preview";

vi.mock("../api/check-out-api", () => ({
  checkOutApi: { preview: vi.fn() },
}));

afterEach(() => {
  vi.clearAllMocks();
});

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useCheckOutPreview", () => {
  it("staleTime e gcTime zerados: reabrir sempre refaz a requisição", async () => {
    vi.mocked(checkOutApi.preview).mockResolvedValue({ total: "560.00" } as never);

    const { result, unmount } = renderHook(() => useCheckOutPreview("r1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    unmount();

    const { result: second } = renderHook(() => useCheckOutPreview("r1"), { wrapper });
    await waitFor(() => expect(second.current.isSuccess).toBe(true));

    expect(checkOutApi.preview).toHaveBeenCalledTimes(2);
  });

  it("não busca nada quando `reservationId` e null", () => {
    const { result } = renderHook(() => useCheckOutPreview(null), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(checkOutApi.preview).not.toHaveBeenCalled();
  });
});

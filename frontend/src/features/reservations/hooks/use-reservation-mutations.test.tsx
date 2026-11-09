import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkInKeys } from "@/features/check-in";
import { checkOutKeys } from "@/features/check-out";
import { dashboardKeys } from "@/features/dashboard";
import { guestKeys } from "@/features/guests";

import { reservationsApi } from "../api/reservations-api";
import { reservationKeys } from "../api/query-keys";
import {
  useCancelReservation,
  useCreateReservation,
  useUpdateReservation,
} from "./use-reservation-mutations";

vi.mock("../api/reservations-api", () => ({
  reservationsApi: { create: vi.fn(), update: vi.fn(), cancel: vi.fn() },
}));

const RESERVATION_INPUT = {
  guest_id: "g1",
  room: "101",
  check_in_date: "2026-09-10",
  check_out_date: "2026-09-11",
  uses_parking: false,
  vehicle_plate: "",
  notes: "",
};

describe("mutações de reserva", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.mocked(reservationsApi.create).mockResolvedValue({ id: "r1" } as never);
    vi.mocked(reservationsApi.update).mockResolvedValue({ id: "r1" } as never);
    vi.mocked(reservationsApi.cancel).mockResolvedValue({ id: "r1" } as never);
  });

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  it("criar reserva invalida as quatro visões, incluindo as filas de check-in/check-out", async () => {
    const spy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useCreateReservation(), { wrapper });

    result.current.mutate(RESERVATION_INPUT);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const invalidated = spy.mock.calls.map((call) => call[0]?.queryKey);
    expect(invalidated).toContainEqual(reservationKeys.all);
    expect(invalidated).toContainEqual(checkInKeys.all);
    expect(invalidated).toContainEqual(checkOutKeys.all);
    expect(invalidated).toContainEqual(guestKeys.all);
    expect(invalidated).toContainEqual(dashboardKeys.all);
  });

  it("editar reserva invalida as quatro visões, incluindo as filas de check-in/check-out", async () => {
    const spy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useUpdateReservation("r1"), { wrapper });

    result.current.mutate(RESERVATION_INPUT);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const invalidated = spy.mock.calls.map((call) => call[0]?.queryKey);
    expect(invalidated).toContainEqual(checkInKeys.all);
    expect(invalidated).toContainEqual(checkOutKeys.all);
  });

  it("cancelar reserva invalida as quatro visões, incluindo as filas de check-in/check-out", async () => {
    const spy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useCancelReservation(), { wrapper });

    result.current.mutate("r1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const invalidated = spy.mock.calls.map((call) => call[0]?.queryKey);
    expect(invalidated).toContainEqual(checkInKeys.all);
    expect(invalidated).toContainEqual(checkOutKeys.all);
  });
});

import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders, screen, waitFor, within } from "@/test/utils";

import { CheckInPage } from "./check-in-page";

vi.mock("@/shared/lib/date", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/lib/date")>()),
  todayIsoDate: () => "2026-09-04",
}));
vi.mock("../lib/check-in-window", () => ({ isCheckInAllowed: () => true }));

describe("CheckInPage", () => {
  it("lista as chegadas de hoje", async () => {
    renderWithProviders(<CheckInPage />, { withAuth: false });
    expect(await screen.findByText("Jose Antonio Silva")).toBeInTheDocument();
  });

  it("lê o escopo da URL", async () => {
    renderWithProviders(<CheckInPage />, {
      withAuth: false,
      route: "/check-in?scope=overdue",
    });

    expect(
      await screen.findByRole("button", { name: "Atrasadas", pressed: true }),
    ).toBeInTheDocument();
  });

  it("mantém o escopo na URL ao trocar de aba", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CheckInPage />, { withAuth: false, route: "/check-in" });

    await user.click(screen.getByRole("button", { name: "Todas" }));

    expect(
      await screen.findByRole("button", { name: "Todas", pressed: true }),
    ).toBeInTheDocument();
  });

  it("a aba de histórico é só leitura e mostra o status da reserva", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CheckInPage />, { withAuth: false, route: "/check-in" });
    await screen.findByText("Jose Antonio Silva");

    await user.click(screen.getByRole("button", { name: "Histórico" }));

    expect(await screen.findByText("Marina Souza")).toBeInTheDocument();
    expect(screen.getByText("Finalizada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /check-in/i })).not.toBeInTheDocument();
  });

  it("abre o dialog de check-in com o resumo da reserva", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CheckInPage />, { withAuth: false });
    await screen.findByText("Jose Antonio Silva");

    await user.click(screen.getByRole("button", { name: /check-in/i }));
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Confirmar check-in" }),
    ).toBeInTheDocument();
  });

  it("confirmar o check-in chama a API e fecha o dialog", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CheckInPage />, { withAuth: false });
    await screen.findByText("Jose Antonio Silva");

    await user.click(screen.getByRole("button", { name: /check-in/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Confirmar check-in" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

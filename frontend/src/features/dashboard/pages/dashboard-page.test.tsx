import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { server } from "@/test/msw/server";
import { renderWithProviders, screen, waitFor, within } from "@/test/utils";

import { DashboardPage } from "./dashboard-page";

const API_URL = "http://localhost:8000/api";

describe("DashboardPage", () => {
  it("mostra os seis KPIs com os valores do resumo", async () => {
    renderWithProviders(<DashboardPage />, { withAuth: true });

    expect(
      await screen.findByText("Hóspedes no hotel", { selector: "span" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("12")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("mostra os cards de chegadas e saídas", async () => {
    renderWithProviders(<DashboardPage />, { withAuth: true });

    expect(
      await screen.findByText("Chegadas de hoje", { selector: "h3" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Saídas de hoje", { selector: "h3" })).toBeInTheDocument();
    expect(screen.getByText("Hóspedes no hotel", { selector: "h3" })).toBeInTheDocument();
  });

  it("uma seção de KPI com erro não derruba o resto da página", async () => {
    server.use(http.get(`${API_URL}/dashboard/summary/`, () => HttpResponse.error()));
    renderWithProviders(<DashboardPage />, { withAuth: true });

    await waitFor(() => expect(screen.getByText("Tentar novamente")).toBeInTheDocument());
    expect(
      await screen.findByText("Chegadas de hoje", { selector: "h3" }),
    ).toBeInTheDocument();
  });

  it("mostra skeletons antes de os dados chegarem", () => {
    const { container } = renderWithProviders(<DashboardPage />, { withAuth: true });
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("abre o dialog de nova reserva pela ação do cabeçalho", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardPage />, { withAuth: true });
    const button = await screen.findByRole("button", { name: "Nova reserva" });
    await user.click(button);
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Nova reserva" }),
    ).toBeInTheDocument();
  });

  it("check-in pelas chegadas de hoje abre o dialog daquela reserva", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardPage />, { withAuth: true });

    await screen.findByText("Chegadas de hoje", { selector: "h3" });
    await user.click((await screen.findAllByRole("button", { name: "Check-in" }))[0]!);

    expect(
      await screen.findByRole("dialog", { name: "Confirmar check-in" }),
    ).toBeInTheDocument();
  });

  it("check-out pelas saídas de hoje abre o dialog com o detalhamento", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardPage />, { withAuth: true });

    await screen.findByText("Saídas de hoje", { selector: "h3" });
    await user.click((await screen.findAllByRole("button", { name: "Check-out" }))[0]!);

    const dialog = await screen.findByRole("dialog", { name: "Confirmar check-out" });
    expect(await within(dialog).findByText("Total geral")).toBeInTheDocument();
  });
});

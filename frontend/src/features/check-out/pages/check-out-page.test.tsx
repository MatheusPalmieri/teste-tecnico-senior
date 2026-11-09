import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithProviders, screen, within } from "@/test/utils";

import { CheckOutPage } from "./check-out-page";

describe("CheckOutPage", () => {
  it("lista as saídas de quem está no hotel", async () => {
    renderWithProviders(<CheckOutPage />, { withAuth: false });
    expect(await screen.findByText("Jose Antonio Silva")).toBeInTheDocument();
  });

  it("lê o escopo da URL", async () => {
    renderWithProviders(<CheckOutPage />, {
      withAuth: false,
      route: "/check-out?scope=late",
    });

    expect(
      await screen.findByRole("button", { name: "Atrasadas", pressed: true }),
    ).toBeInTheDocument();
  });

  it("a aba de histórico é só leitura e mostra o status da reserva", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CheckOutPage />, { withAuth: false, route: "/check-out" });
    await screen.findByText("Jose Antonio Silva");

    await user.click(screen.getByRole("button", { name: "Histórico" }));

    expect(await screen.findByText("Marina Souza")).toBeInTheDocument();
    expect(screen.getByText("Finalizada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /check-out/i })).not.toBeInTheDocument();
  });

  it("volta ao escopo padrão quando a URL traz um desconhecido", async () => {
    renderWithProviders(<CheckOutPage />, {
      withAuth: false,
      route: "/check-out?scope=nonsense",
    });

    expect(
      await screen.findByRole("button", { name: "Hoje", pressed: true }),
    ).toBeInTheDocument();
  });

  it("fluxo completo: o check-out pela fila mostra o detalhamento e depois o recibo", async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<CheckOutPage />, { withAuth: false });
    await screen.findByText("Jose Antonio Silva");

    await user.click(screen.getAllByRole("button", { name: /check-out/i })[0]!);
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("R$ 510,00")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Fazer check-out" }));
    await new Promise((resolve) => setTimeout(resolve, 350));
    await user.click(within(dialog).getByRole("button", { name: "Confirmar check-out" }));

    const receipt = await screen.findByRole("dialog", { name: /Recibo — R-0002/ });
    expect(within(receipt).getByRole("button", { name: /Imprimir/ })).toBeInTheDocument();
  });
});

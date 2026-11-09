import { describe, expect, it } from "vitest";

import { renderWithProviders, screen } from "@/test/utils";

import NotFoundPage from "./not-found-page";

describe("NotFoundPage", () => {
  it("explica o 404 e oferece o caminho de volta ao dashboard", () => {
    renderWithProviders(<NotFoundPage />, {
      withAuth: false,
      route: "/rota-inexistente",
    });

    expect(screen.getByText("Página não encontrada")).toBeInTheDocument();
    expect(
      screen.getByText("O endereço acessado não existe ou foi movido."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar ao dashboard" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});

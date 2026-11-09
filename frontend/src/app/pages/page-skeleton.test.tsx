import { describe, expect, it } from "vitest";

import { renderWithProviders, screen } from "@/test/utils";

import { PageSkeleton } from "./page-skeleton";

describe("PageSkeleton (nunca tela em branco)", () => {
  it("escreve o cabeçalho conhecido de verdade, sem placeholder no título", () => {
    renderWithProviders(
      <PageSkeleton title="Reservas" description="Todas as reservas do hotel" />,
      { withAuth: false },
    );

    expect(screen.getByRole("heading", { name: "Reservas" })).toBeInTheDocument();
    expect(screen.getByText("Todas as reservas do hotel")).toBeInTheDocument();
  });

  it("sem titulo/descricao, o cabeçalho também vira placeholder", () => {
    const { container } = renderWithProviders(<PageSkeleton />, { withAuth: false });

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it.each(["table", "list", "dashboard", "panels"] as const)(
    "a variante %s renderiza um placeholder no lugar do conteúdo",
    (variant) => {
      const { container } = renderWithProviders(<PageSkeleton variant={variant} />, {
        withAuth: false,
      });

      expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    },
  );
});

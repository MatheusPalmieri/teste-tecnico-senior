import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders, screen } from "@/test/utils";

import { RouteErrorBoundary } from "./route-error-boundary";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

function Boom(): never {
  throw new Error("falha de renderização");
}

describe("RouteErrorBoundary", () => {
  it("renderiza os filhos quando nada falha", () => {
    renderWithProviders(
      <RouteErrorBoundary>
        <p>conteúdo da rota</p>
      </RouteErrorBoundary>,
      { withAuth: false },
    );

    expect(screen.getByText("conteúdo da rota")).toBeInTheDocument();
  });

  it("erro de renderização mostra o fallback em vez de derrubar a rota", () => {
    renderWithProviders(
      <RouteErrorBoundary>
        <Boom />
      </RouteErrorBoundary>,
      { withAuth: false },
    );

    expect(screen.getByText("Algo deu errado nesta página")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });

  it("registra o erro no console para diagnóstico", () => {
    renderWithProviders(
      <RouteErrorBoundary>
        <Boom />
      </RouteErrorBoundary>,
      { withAuth: false },
    );

    expect(console.error).toHaveBeenCalledWith(
      "Erro não tratado em uma rota:",
      expect.objectContaining({ message: "falha de renderização" }),
      expect.anything(),
    );
  });

  it('"Tentar novamente" remonta os filhos', async () => {
    const user = userEvent.setup();
    let shouldFail = true;

    function FailsUntilFixed() {
      if (shouldFail) throw new Error("falha de renderização");
      return <p>rota recuperada</p>;
    }

    renderWithProviders(
      <RouteErrorBoundary>
        <FailsUntilFixed />
      </RouteErrorBoundary>,
      { withAuth: false },
    );
    expect(screen.getByText("Algo deu errado nesta página")).toBeInTheDocument();

    shouldFail = false;
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(screen.getByText("rota recuperada")).toBeInTheDocument();
  });
});

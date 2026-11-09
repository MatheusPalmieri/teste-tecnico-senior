import { Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

import { renderWithProviders, screen } from "@/test/utils";

import { RequireAuth } from "./require-auth";

function TestRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<p>Página de login</p>} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <p>Conteudo protegido</p>
          </RequireAuth>
        }
      />
    </Routes>
  );
}

describe("RequireAuth", () => {
  it("rota protegida sem sessão redireciona para /login", async () => {
    renderWithProviders(<TestRoutes />, { route: "/" });

    expect(await screen.findByText(/página de login/i)).toBeInTheDocument();
  });
});

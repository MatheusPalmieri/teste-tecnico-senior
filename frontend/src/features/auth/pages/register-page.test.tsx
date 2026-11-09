import { HttpResponse, http } from "msw";
import { Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

import { server } from "@/test/msw/server";
import { renderWithProviders, screen } from "@/test/utils";

import { RegisterPage } from "./register-page";

const API_URL = "http://localhost:8000/api";

describe("RegisterPage", () => {
  it("mostra o cadastro e o link de volta ao login para quem não está logado", async () => {
    server.use(
      http.get(`${API_URL}/auth/me/`, () =>
        HttpResponse.json({ code: "not_authenticated" }, { status: 401 }),
      ),
      http.post(`${API_URL}/auth/refresh/`, () =>
        HttpResponse.json({ code: "token_not_valid" }, { status: 401 }),
      ),
    );
    renderWithProviders(<RegisterPage />, { route: "/register" });

    expect(
      await screen.findByRole("heading", { name: "Criar conta" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("manda o atendente já logado para o dashboard", async () => {
    server.use(
      http.get(`${API_URL}/auth/me/`, () =>
        HttpResponse.json({ id: "1", name: "Atendente", email: "a@hotel.com" }),
      ),
    );
    renderWithProviders(
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<p>Dashboard</p>} />
      </Routes>,
      { route: "/register" },
    );

    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
  });
});

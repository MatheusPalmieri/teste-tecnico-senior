import { describe, expect, it } from "vitest";

import { render, screen } from "@/test/utils";

import { App } from "./app";

describe("App", () => {
  it("monta a aplicação sem erro e mostra o bootstrap de autenticação", async () => {
    render(<App />);

    expect(await screen.findByText(/entrar no hotel/i)).toBeInTheDocument();
  });
});

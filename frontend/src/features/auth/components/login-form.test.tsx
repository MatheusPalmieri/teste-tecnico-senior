import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders, screen, waitFor } from "@/test/utils";

import { LoginForm } from "./login-form";

describe("LoginForm", () => {
  it("valida e-mail e senha obrigatórios", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm onSuccess={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByText(/informe o e-mail/i)).toBeInTheDocument();
    expect(
      screen.getByText(/senha deve ter pelo menos 6 caracteres/i),
    ).toBeInTheDocument();
  });

  it("401 exibe mensagem genérica de credenciais", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText(/e-mail/i), "atendente@hotel.com");
    await user.type(screen.getByLabelText(/^senha$/i), "senhaerrada");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /e-mail ou senha inválidos/i,
    );
  });

  it("login bem-sucedido chama onSuccess", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    renderWithProviders(<LoginForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/e-mail/i), "atendente@hotel.com");
    await user.type(screen.getByLabelText(/^senha$/i), "senha123");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("alterna a visibilidade da senha", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm onSuccess={vi.fn()} />);

    const passwordInput = screen.getByLabelText(/^senha$/i);
    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: /mostrar senha/i }));
    expect(passwordInput).toHaveAttribute("type", "text");
  });
});

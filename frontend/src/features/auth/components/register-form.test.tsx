import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders, screen, waitFor } from "@/test/utils";

import { RegisterForm } from "./register-form";

const STRONG_PASSWORD = "Hotel@2026rec";

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  {
    email = "maria@hotel.com",
    password = STRONG_PASSWORD,
    confirmPassword = password,
  }: { email?: string; password?: string; confirmPassword?: string } = {},
) {
  await user.type(screen.getByLabelText(/nome/i), "Maria Souza");
  await user.type(screen.getByLabelText(/e-mail/i), email);
  await user.type(screen.getByLabelText(/^senha$/i), password);
  await user.type(screen.getByLabelText(/confirmar senha/i), confirmPassword);
}

describe("RegisterForm", () => {
  it("exige nome, e-mail e senha", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm onSuccess={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /criar conta/i }));

    expect(await screen.findByText(/informe o nome/i)).toBeInTheDocument();
    expect(screen.getByText(/informe o e-mail/i)).toBeInTheDocument();
    expect(screen.getByText(/informe a senha/i)).toBeInTheDocument();
  });

  it("recusa e-mail com formato inválido", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    renderWithProviders(<RegisterForm onSuccess={onSuccess} />);

    await fillForm(user, { email: "maria@" });
    await user.click(screen.getByRole("button", { name: /criar conta/i }));

    expect(await screen.findByText(/e-mail inválido/i)).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it.each([
    ["Ab1@efg", /8 caracteres/i],
    ["hotel@2026rec", /maiúscula/i],
    ["HOTEL@2026REC", /minúscula/i],
    ["Hotel@Recepcao", /número/i],
    ["Hotel2026rec", /especial/i],
  ])(
    "Senha %s não é enviada e o requisito faltante fica pendente",
    async (password, requirement) => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      renderWithProviders(<RegisterForm onSuccess={onSuccess} />);

      await fillForm(user, { password });
      await user.click(screen.getByRole("button", { name: /criar conta/i }));

      expect(
        await screen.findByText(/a senha ainda não atende aos requisitos/i),
      ).toBeInTheDocument();

      const pendingRule = screen.getByText(requirement).closest("li");
      expect(pendingRule).toHaveTextContent(/pendente/i);
      expect(onSuccess).not.toHaveBeenCalled();
    },
  );

  it("senha forte marca todos os requisitos como atendidos", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText(/^senha$/i), STRONG_PASSWORD);

    const rules = screen.getAllByRole("listitem");
    expect(rules).toHaveLength(5);
    for (const rule of rules) {
      expect(rule).toHaveTextContent(/atendido/i);
    }
  });

  it("recusa confirmação de senha diferente", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    renderWithProviders(<RegisterForm onSuccess={onSuccess} />);

    await fillForm(user, { confirmPassword: "Outra@2026rec" });
    await user.click(screen.getByRole("button", { name: /criar conta/i }));

    expect(await screen.findByText(/as senhas não conferem/i)).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("cadastro válido cria a conta e chama onSuccess", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    renderWithProviders(<RegisterForm onSuccess={onSuccess} />);

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /criar conta/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("e-mail já cadastrado vira erro no campo e-mail", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    renderWithProviders(<RegisterForm onSuccess={onSuccess} />);

    await fillForm(user, { email: "atendente@hotel.com" });
    await user.click(screen.getByRole("button", { name: /criar conta/i }));

    expect(await screen.findByText(/este e-mail já está em uso/i)).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("senha reprovada pelo servidor aparece no campo senha", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    renderWithProviders(<RegisterForm onSuccess={onSuccess} />);

    await fillForm(user, { password: "P@ssword1" });
    await user.click(screen.getByRole("button", { name: /criar conta/i }));

    expect(await screen.findByText(/esta senha é muito comum/i)).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("alterna a visibilidade da senha", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm onSuccess={vi.fn()} />);

    const passwordInput = screen.getByLabelText(/^senha$/i);
    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: /mostrar senha/i }));
    expect(passwordInput).toHaveAttribute("type", "text");
  });
});

import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { server } from "@/test/msw/server";
import { renderWithProviders, screen } from "@/test/utils";

import { SettingsPage } from "./settings-page";

const API_URL = "http://localhost:8000/api";

function mockAuthenticated(): void {
  server.use(
    http.get(`${API_URL}/auth/me/`, () =>
      HttpResponse.json({
        id: "1",
        name: "Atendente Demo",
        email: "atendente@hotel.com",
        date_joined: "2026-01-01T00:00:00-03:00",
      }),
    ),
  );
}

describe("SettingsPage", () => {
  it("mostra o perfil só leitura, sem abas e sem campos", async () => {
    mockAuthenticated();
    renderWithProviders(<SettingsPage />, { route: "/configuracoes" });

    expect((await screen.findAllByText("atendente@hotel.com")).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Editar perfil/ })).toBeInTheDocument();
    expect(screen.queryByLabelText("Nome")).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("o botão de editar mostra os campos do perfil", async () => {
    mockAuthenticated();
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />, { route: "/configuracoes" });

    await user.click(await screen.findByRole("button", { name: /Editar perfil/ }));

    expect(await screen.findByLabelText("Nome")).toHaveValue("Atendente Demo");
    expect(screen.getByLabelText("E-mail")).toHaveValue("atendente@hotel.com");
  });

  it("cancelar descarta as mudanças e volta ao modo leitura", async () => {
    mockAuthenticated();
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />, { route: "/configuracoes" });

    await user.click(await screen.findByRole("button", { name: /Editar perfil/ }));
    await user.type(await screen.findByLabelText("Nome"), " Silva");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByLabelText("Nome")).not.toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /Editar perfil/ }),
    ).toBeInTheDocument();
  });

  it("salvar fica desabilitado até o formulário mudar", async () => {
    mockAuthenticated();
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />, { route: "/configuracoes" });

    await user.click(await screen.findByRole("button", { name: /Editar perfil/ }));

    const nameInput = await screen.findByLabelText("Nome");
    const saveButton = screen.getByRole("button", { name: "Salvar" });
    expect(saveButton).toBeDisabled();

    await user.type(nameInput, " Silva");
    expect(saveButton).not.toBeDisabled();
  });

  it("salvar o nome atualiza o perfil e fecha a edição", async () => {
    mockAuthenticated();
    server.use(
      http.patch(`${API_URL}/auth/me/`, () =>
        HttpResponse.json({
          id: "1",
          name: "Atendente Silva",
          email: "atendente@hotel.com",
          date_joined: "2026-01-01T00:00:00-03:00",
        }),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />, { route: "/configuracoes" });

    await user.click(await screen.findByRole("button", { name: /Editar perfil/ }));
    const nameInput = await screen.findByLabelText("Nome");
    await user.clear(nameInput);
    await user.type(nameInput, "Atendente Silva");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(
      await screen.findByRole("button", { name: /Editar perfil/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Atendente Silva").length).toBeGreaterThan(0);
  });

  it("abre o dialog de troca de senha", async () => {
    mockAuthenticated();
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />, { route: "/configuracoes" });

    await user.click(await screen.findByRole("button", { name: "Alterar senha" }));

    expect(await screen.findByLabelText("Nova senha")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirmar nova senha")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha atual")).toBeInTheDocument();
  });

  it("confirmação de senha divergente bloqueia o envio", async () => {
    mockAuthenticated();
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />, { route: "/configuracoes" });

    await user.click(await screen.findByRole("button", { name: "Alterar senha" }));

    await user.type(await screen.findByLabelText("Nova senha"), "nova-senha-forte");
    await user.type(screen.getByLabelText("Confirmar nova senha"), "outra-coisa");
    await user.click(screen.getByRole("button", { name: "Salvar senha" }));

    expect(await screen.findByText("As senhas não coincidem.")).toBeInTheDocument();
  });

  it("o sucesso envia a senha atual, fecha o dialog e limpa os campos", async () => {
    mockAuthenticated();
    let body: unknown;
    server.use(
      http.post(`${API_URL}/auth/change-password/`, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />, { route: "/configuracoes" });

    await user.click(await screen.findByRole("button", { name: "Alterar senha" }));

    await user.type(await screen.findByLabelText("Senha atual"), "Senha-Antiga-1");
    await user.type(screen.getByLabelText("Nova senha"), "Nova-Senha-2026!");
    await user.type(screen.getByLabelText("Confirmar nova senha"), "Nova-Senha-2026!");
    await user.click(screen.getByRole("button", { name: "Salvar senha" }));

    await screen.findByRole("button", { name: "Alterar senha" });
    expect(screen.queryByLabelText("Nova senha")).not.toBeInTheDocument();
    expect(body).toEqual({
      current_password: "Senha-Antiga-1",
      new_password: "Nova-Senha-2026!",
    });
  });

  it("bloqueia a troca de senha sem a senha atual", async () => {
    mockAuthenticated();
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />, { route: "/configuracoes" });

    await user.click(await screen.findByRole("button", { name: "Alterar senha" }));
    await user.type(await screen.findByLabelText("Nova senha"), "Nova-Senha-2026!");
    await user.type(screen.getByLabelText("Confirmar nova senha"), "Nova-Senha-2026!");
    await user.click(screen.getByRole("button", { name: "Salvar senha" }));

    expect(await screen.findByText("Informe a senha atual.")).toBeInTheDocument();
  });

  it("aplica a mesma política de senha do cadastro", async () => {
    mockAuthenticated();
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />, { route: "/configuracoes" });

    await user.click(await screen.findByRole("button", { name: "Alterar senha" }));
    await user.type(await screen.findByLabelText("Senha atual"), "Senha-Antiga-1");
    await user.type(screen.getByLabelText("Nova senha"), "semmaiuscula1!");
    await user.type(screen.getByLabelText("Confirmar nova senha"), "semmaiuscula1!");
    await user.click(screen.getByRole("button", { name: "Salvar senha" }));

    expect(await screen.findByText(/maiúscula, minúscula, número/)).toBeInTheDocument();
  });

  it("mostra o erro do backend quando a senha atual está errada", async () => {
    mockAuthenticated();
    server.use(
      http.post(`${API_URL}/auth/change-password/`, () =>
        HttpResponse.json(
          {
            detail: "Senha atual incorreta.",
            code: "invalid_current_password",
            fields: { current_password: ["Senha atual incorreta."] },
          },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />, { route: "/configuracoes" });

    await user.click(await screen.findByRole("button", { name: "Alterar senha" }));
    await user.type(await screen.findByLabelText("Senha atual"), "chute");
    await user.type(screen.getByLabelText("Nova senha"), "Nova-Senha-2026!");
    await user.type(screen.getByLabelText("Confirmar nova senha"), "Nova-Senha-2026!");
    await user.click(screen.getByRole("button", { name: "Salvar senha" }));

    expect(await screen.findByText("Senha atual incorreta.")).toBeInTheDocument();
  });

  it("mudar o e-mail pede a senha atual e a envia", async () => {
    mockAuthenticated();
    let body: unknown;
    server.use(
      http.patch(`${API_URL}/auth/me/`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          id: "1",
          name: "Atendente Demo",
          email: "novo@hotel.com",
          date_joined: "2026-01-01T00:00:00-03:00",
        });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />, { route: "/configuracoes" });

    await user.click(await screen.findByRole("button", { name: /Editar perfil/ }));
    expect(screen.queryByLabelText("Senha atual")).not.toBeInTheDocument();

    const emailInput = screen.getByLabelText("E-mail");
    await user.clear(emailInput);
    await user.type(emailInput, "novo@hotel.com");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(
      await screen.findByText("Informe a senha atual para trocar o e-mail."),
    ).toBeInTheDocument();
    expect(body).toBeUndefined();

    await user.type(screen.getByLabelText("Senha atual"), "Senha-Antiga-1");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(
      await screen.findByRole("button", { name: /Editar perfil/ }),
    ).toBeInTheDocument();
    expect(body).toEqual({
      name: "Atendente Demo",
      email: "novo@hotel.com",
      current_password: "Senha-Antiga-1",
    });
  });

  it("mudar só o nome não envia senha", async () => {
    mockAuthenticated();
    let body: unknown;
    server.use(
      http.patch(`${API_URL}/auth/me/`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          id: "1",
          name: "Atendente Silva",
          email: "atendente@hotel.com",
          date_joined: "2026-01-01T00:00:00-03:00",
        });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />, { route: "/configuracoes" });

    await user.click(await screen.findByRole("button", { name: /Editar perfil/ }));
    await user.type(await screen.findByLabelText("Nome"), " Silva");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await screen.findByRole("button", { name: /Editar perfil/ });
    expect(body).toEqual({ name: "Atendente Demo Silva", email: "atendente@hotel.com" });
  });
});

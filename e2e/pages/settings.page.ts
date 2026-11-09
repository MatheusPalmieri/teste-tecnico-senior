import type { Page } from "@playwright/test";

export class SettingsPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto("/configuracoes");
  }

  async updateName(name: string): Promise<void> {
    await this.page.getByRole("button", { name: /Editar perfil/ }).click();
    const field = this.page.getByLabel("Nome");
    await field.fill(name);
    await this.page.getByRole("button", { name: "Salvar" }).click();
  }

  async changePassword(next: string, confirm = next): Promise<void> {
    await this.page.getByRole("button", { name: "Alterar senha" }).click();
    await this.page.getByLabel("Nova senha", { exact: true }).fill(next);
    await this.page.getByLabel("Confirmar nova senha").fill(confirm);
    await this.page.getByRole("button", { name: "Salvar senha" }).click();
  }
}

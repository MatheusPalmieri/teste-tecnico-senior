import { expect, type Page } from "@playwright/test";

export class LoginPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto("/login");
  }

  async login(email: string, password: string): Promise<void> {
    await this.page.getByLabel("E-mail").fill(email);
    await this.page.getByRole("textbox", { name: "Senha" }).fill(password);
    await this.page.getByRole("button", { name: "Entrar" }).click();
  }

  genericError() {
    return this.page.getByRole("alert");
  }

  async expectLoggedOut(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login/);
  }
}

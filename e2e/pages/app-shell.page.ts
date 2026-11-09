import type { Locator, Page } from "@playwright/test";

export class AppShellPage {
  constructor(private readonly page: Page) {}

  nav(): Locator {
    return this.page.getByRole("navigation", { name: "Navegacao principal" });
  }

  async goTo(
    label: "Dashboard" | "Hóspedes" | "Reservas" | "Check-in" | "Check-out",
  ): Promise<void> {
    await this.nav().getByRole("link", { name: label }).click();
  }

  async openUserMenu(): Promise<void> {
    await this.page.getByRole("button", { name: /atendente/i }).click();
  }

  async logout(): Promise<void> {
    await this.openUserMenu();
    await this.page.getByRole("menuitem", { name: "Sair" }).click();
  }
}

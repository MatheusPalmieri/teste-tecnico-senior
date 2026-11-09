import { expect, type Page } from "@playwright/test";

export class GuestsPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto("/hospedes");
  }

  async openCreateDialog(): Promise<void> {
    await this.page.getByRole("button", { name: "Novo hóspede" }).first().click();
  }

  dialog() {
    return this.page.getByRole("dialog");
  }

  async fillForm(data: {
    name: string;
    document: string;
    phone: string;
    email?: string;
  }): Promise<void> {
    const dialog = this.dialog();
    await dialog.getByLabel("Nome").fill(data.name);
    await dialog.getByLabel(/Documento/).fill(data.document);
    await dialog.getByLabel("Telefone").fill(data.phone);
    if (data.email) await dialog.getByLabel(/E-mail/).fill(data.email);
  }

  async submitCreate(): Promise<void> {
    await this.dialog().getByRole("button", { name: "Cadastrar" }).click();
  }

  async submitEdit(): Promise<void> {
    await this.dialog().getByRole("button", { name: "Salvar" }).click();
  }

  row(guestName: string) {
    return this.page.getByRole("row").filter({ hasText: guestName });
  }

  async expectListed(guestName: string): Promise<void> {
    await expect(this.row(guestName)).toBeVisible();
  }

  async expectNotListed(guestName: string): Promise<void> {
    await expect(this.row(guestName)).toHaveCount(0);
  }
}

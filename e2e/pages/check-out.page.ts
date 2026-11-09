import { expect, type Locator, type Page } from "@playwright/test";

import { advance } from "../support/clock";

export class CheckOutPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto("/check-out");
  }

  async openDialogFor(guestName: string): Promise<void> {
    await this.page
      .getByRole("listitem")
      .filter({ hasText: guestName })
      .getByRole("button", { name: "Check-out" })
      .click();
  }

  async selectScope(label: string): Promise<void> {
    await this.page.getByRole("button", { name: label, exact: true }).click();
  }

  dialog(): Locator {
    return this.page.getByRole("dialog");
  }

  totalAmount(): Locator {
    return this.dialog().getByText("Total geral").locator("..").getByText(/R\$/);
  }

  chargeLine(description: string): Locator {
    return this.dialog().getByText(description).last().locator("..");
  }

  lateCheckOutAlert(): Locator {
    return this.page.getByText(/Check-out após as/);
  }

  confirmButton(): Locator {
    return this.dialog().getByRole("button", { name: "Fazer check-out" });
  }

  async confirmCheckOut(): Promise<void> {
    await this.confirmButton().click();
    await advance(this.page, 400);
    await this.dialog().getByRole("button", { name: "Confirmar check-out" }).click();
  }

  async expectQueueEmpty(guestName: string): Promise<void> {
    await expect(
      this.page.getByRole("listitem").filter({ hasText: guestName }),
    ).toHaveCount(0);
  }
}

import { expect, type Page } from "@playwright/test";

export class CheckInPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto("/check-in");
  }

  async openDialogFor(guestName: string): Promise<void> {
    await this.page
      .getByRole("listitem")
      .filter({ hasText: guestName })
      .getByRole("button", { name: "Check-in" })
      .click();
  }

  dialog() {
    return this.page.getByRole("dialog");
  }

  earlyCheckInAlert() {
    return this.page.getByText("Check-in previsto a partir das 14h00");
  }

  async authorizeEarly(): Promise<void> {
    await this.dialog()
      .getByLabel(/autorizar/i)
      .check();
  }

  confirmButton() {
    return this.dialog().getByRole("button", { name: "Confirmar check-in" });
  }

  async confirm(): Promise<void> {
    await this.confirmButton().click();
  }

  async expectQueueEmpty(guestName: string): Promise<void> {
    await expect(
      this.page.getByRole("listitem").filter({ hasText: guestName }),
    ).toHaveCount(0);
  }
}

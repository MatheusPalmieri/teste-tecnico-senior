import { expect, type Locator, type Page } from "@playwright/test";

export class ReservationsPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto("/reservas");
  }

  async openHistory(): Promise<void> {
    await this.page.getByRole("button", { name: /Histórico/ }).click();
  }

  async openCreateDialog(): Promise<void> {
    await this.page.getByRole("button", { name: "Nova reserva" }).first().click();
  }

  dialog(): Locator {
    return this.page
      .getByRole("dialog")
      .filter({ hasText: /reserva/i })
      .first();
  }

  async selectGuest(guestName: string): Promise<void> {
    await this.dialog().getByText("Buscar hóspede...", { exact: true }).click();
    const searchInput = this.page.getByPlaceholder("Nome, documento ou telefone");
    await searchInput.fill(guestName);
    const option = this.page.getByRole("option", { name: new RegExp(guestName) });
    await expect(option).toBeVisible();
    await searchInput.press("Enter");
    await expect(option).toHaveCount(0);
  }

  async fillDates(checkIn: string, checkOut: string): Promise<void> {
    await this.pickDate("Entrada", checkIn);
    await this.pickDate("Saída", checkOut);
  }

  async pickCheckIn(isoDate: string): Promise<void> {
    await this.pickDate("Entrada", isoDate);
  }

  async expectCheckOutDayDisabled(isoDate: string): Promise<void> {
    const cell = await this.locateDayCell("Saída", isoDate);
    await expect(cell.getByRole("button")).toBeDisabled();
    await this.page.keyboard.press("Escape");
  }

  private async pickDate(label: string, isoDate: string): Promise<void> {
    const cell = await this.locateDayCell(label, isoDate);
    await cell.getByRole("button").click();
  }

  private async locateDayCell(label: string, isoDate: string) {
    await this.dialog().getByLabel(label).click();
    const calendar = this.page.locator('[role="dialog"][data-state="open"]').filter({
      has: this.page.getByRole("grid"),
    });
    const cell = calendar.locator(`[data-day="${isoDate}"]:not([data-outside])`);
    for (let attempt = 0; attempt < 36 && (await cell.count()) === 0; attempt += 1) {
      const anchor = calendar.locator("[data-day]:not([data-outside])").first();
      const anchorDay = await anchor.getAttribute("data-day");
      const goNext = !anchorDay || anchorDay < isoDate;
      await calendar
        .getByRole("button", {
          name: goNext ? "Go to the Next Month" : "Go to the Previous Month",
        })
        .click();
    }
    return cell;
  }

  async selectRoom(room: string): Promise<void> {
    await this.dialog().getByRole("combobox").last().click();
    await this.page.getByRole("option", { name: room, exact: true }).click();
  }

  async toggleParking(): Promise<void> {
    await this.dialog().getByLabel("Usa vaga de carro").click();
  }

  async submit(): Promise<void> {
    await this.dialog().getByRole("button", { name: "Salvar reserva" }).click();
  }

  totalAmount(): Locator {
    return this.dialog().getByText("Total geral").locator("..").getByText(/R\$/);
  }

  row(guestName: string) {
    return this.page.getByRole("row").filter({ hasText: guestName });
  }

  async cancelReservation(guestName: string): Promise<void> {
    await this.row(guestName)
      .getByRole("button", { name: /^Acoes|^Ações/ })
      .click();
    await this.page.getByRole("menuitem", { name: "Cancelar reserva" }).click();
    await this.page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Cancelar reserva" })
      .click();
  }

  async expectStatusBadge(guestName: string, status: string): Promise<void> {
    await expect(this.row(guestName).getByText(status)).toBeVisible();
  }
}

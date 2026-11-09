import { expect, type Page } from "@playwright/test";

export class DashboardPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto("/");
  }

  kpi(label: string) {
    return this.page.getByText(label).locator("..");
  }

  async clickKpi(label: string): Promise<void> {
    await this.page.getByRole("button").filter({ hasText: label }).click();
  }

  async expectInHouseCount(count: number): Promise<void> {
    await expect(this.kpi("Hóspedes no hotel").getByText(String(count))).toBeVisible();
  }
}

import type { Page } from "@playwright/test";

export async function freezeAt(page: Page, iso: string): Promise<void> {
  await page.clock.setFixedTime(new Date(iso));
  await page.context().setExtraHTTPHeaders({ "X-E2E-Now": iso });
}

export async function advance(page: Page, ms: number): Promise<void> {
  const current = await page.evaluate(() => Date.now());
  await page.clock.setFixedTime(new Date(current + ms));
}

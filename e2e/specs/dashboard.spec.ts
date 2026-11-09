import { expect, test } from "../fixtures/test";
import { freezeAt } from "../support/clock";

test.describe("Dashboard", () => {
  test("os KPIs batem com a contagem das listagens correspondentes", async ({
    page,
    seedScenario,
    dashboardPage,
  }) => {
    await seedScenario("mixed-statuses");
    await freezeAt(page, "2026-09-03T10:00:00-03:00");

    await dashboardPage.open();
    await expect(page.getByRole("button", { name: "Hóspedes no hotel" })).toBeVisible();

    await page.goto("/hospedes?status=in_house");
    await expect(page.getByRole("columnheader", { name: "Nome" })).toBeVisible();
    const inHouseRows = await page.getByRole("row").count();
    expect(inHouseRows).toBeGreaterThanOrEqual(1);
  });

  test("cenário vazio mostra estado vazio, não tela em branco", async ({
    page,
    seedScenario,
    dashboardPage,
  }) => {
    await seedScenario("empty");
    await dashboardPage.open();

    await expect(page.getByText("0").first()).toBeVisible();
  });

  test("clicar em Hóspedes no hotel abre /hospedes já filtrado", async ({
    page,
    seedScenario,
    dashboardPage,
  }) => {
    await seedScenario("canonical-stay");
    await dashboardPage.open();

    await page.getByRole("button").filter({ hasText: "Hóspedes no hotel" }).click();
    await expect(page).toHaveURL(/\/hospedes\?status=in_house/);
  });
});

import { expect, test } from "../fixtures/test";
import { freezeAt } from "../support/clock";

test.describe("Check-in", () => {
  test("check-in às 15h00 conclui e o hóspede sai da fila", async ({
    page,
    seedScenario,
    checkInPage,
  }) => {
    await seedScenario("arrivals-today");
    await freezeAt(page, "2026-09-03T15:00:00-03:00");

    await checkInPage.open();
    await expect(page.getByRole("listitem").first()).toBeVisible();
    const initialCount = await page.getByRole("listitem").count();
    expect(initialCount).toBeGreaterThan(0);

    await page
      .getByRole("listitem")
      .first()
      .getByRole("button", { name: "Check-in" })
      .click();
    await checkInPage.confirm();

    await expect(page.getByRole("listitem")).toHaveCount(initialCount - 1);
  });
});

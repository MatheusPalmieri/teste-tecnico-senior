import { test } from "../fixtures/test";
import { expectNoSeriousA11yViolations } from "../support/a11y";

test.describe("Acessibilidade", () => {
  test.beforeEach(async ({ seedScenario }) => {
    await seedScenario("mixed-statuses");
  });

  const routes = [
    "/",
    "/hospedes",
    "/reservas",
    "/check-in",
    "/check-out",
    "/configuracoes",
  ];

  for (const route of routes) {
    test(`${route} sem violação crítica ou séria`, async ({ page }) => {
      await page.goto(route);
      await expectNoSeriousA11yViolations(page);
    });
  }
});

test.describe("Acessibilidade — /login", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("/login sem violação crítica ou séria", async ({ page }) => {
    await page.goto("/login");
    await expectNoSeriousA11yViolations(page);
  });
});

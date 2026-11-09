import { test as setup } from "@playwright/test";

import { LoginPage } from "../pages/login.page";
import { seedScenario } from "../support/seed";

const AUTH_FILE = ".auth/atendente.json";

setup("authenticate as clerk", async ({ page, request }) => {
  await seedScenario(request, "empty");
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.login("atendente@hotel.com", "senha123");
  await page.waitForURL("/");
  await page.context().storageState({ path: AUTH_FILE });
});

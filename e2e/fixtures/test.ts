import { test as base } from "@playwright/test";

import { AppShellPage } from "../pages/app-shell.page";
import { CheckInPage } from "../pages/check-in.page";
import { CheckOutPage } from "../pages/check-out.page";
import { DashboardPage } from "../pages/dashboard.page";
import { GuestsPage } from "../pages/guests.page";
import { LoginPage } from "../pages/login.page";
import { ReservationsPage } from "../pages/reservations.page";
import { SettingsPage } from "../pages/settings.page";
import { seedScenario, type ScenarioName } from "../support/seed";

interface Fixtures {
  seedScenario: (scenario: ScenarioName) => Promise<void>;
  loginPage: LoginPage;
  appShellPage: AppShellPage;
  guestsPage: GuestsPage;
  reservationsPage: ReservationsPage;
  checkInPage: CheckInPage;
  checkOutPage: CheckOutPage;
  dashboardPage: DashboardPage;
  settingsPage: SettingsPage;
}

export const test = base.extend<Fixtures>({
  seedScenario: async ({ request }, use) => {
    await use((scenario: ScenarioName) => seedScenario(request, scenario));
  },
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  appShellPage: async ({ page }, use) => use(new AppShellPage(page)),
  guestsPage: async ({ page }, use) => use(new GuestsPage(page)),
  reservationsPage: async ({ page }, use) => use(new ReservationsPage(page)),
  checkInPage: async ({ page }, use) => use(new CheckInPage(page)),
  checkOutPage: async ({ page }, use) => use(new CheckOutPage(page)),
  dashboardPage: async ({ page }, use) => use(new DashboardPage(page)),
  settingsPage: async ({ page }, use) => use(new SettingsPage(page)),
});

export { expect } from "@playwright/test";

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./specs",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["html", { open: "never" }], ["list"], ["github"]]
    : [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:4173",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: ".auth/atendente.json" },
    },
    {
      name: "firefox",
      dependencies: ["setup"],
      use: { ...devices["Desktop Firefox"], storageState: ".auth/atendente.json" },
    },
  ],
  webServer: [
    ...(process.env.CI || process.env.E2E_EXTERNAL_BACKEND
      ? []
      : [
          {
            command:
              "python manage.py runserver 127.0.0.1:8000 --noreload --settings=config.settings.e2e",
            cwd: "../backend",
            url: "http://127.0.0.1:8000/api/health/",
            reuseExistingServer: false,
            timeout: 60_000,
          },
        ]),
    {
      command: "npm run preview --prefix ../frontend -- --port 4173 --strictPort",
      url: "http://localhost:4173",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});

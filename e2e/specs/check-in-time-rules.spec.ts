import { expect, test } from "../fixtures/test";
import { freezeAt } from "../support/clock";
import { API_BASE_URL } from "../support/seed";

test.describe("regra das 14h00", () => {
  test.beforeEach(async ({ seedScenario }) => {
    await seedScenario("arrivals-today");
  });

  test("às 13h59: alerta visível e confirmação travada", async ({
    page,
    checkInPage,
  }) => {
    await freezeAt(page, "2026-09-03T13:59:00-03:00");
    await checkInPage.open();
    await page
      .getByRole("listitem")
      .first()
      .getByRole("button", { name: "Check-in" })
      .click();

    await expect(checkInPage.earlyCheckInAlert()).toBeVisible();
    await expect(checkInPage.confirmButton()).toBeDisabled();
  });

  test("às 13h59, autorizar o antecipado destrava e conclui", async ({
    page,
    checkInPage,
  }) => {
    await freezeAt(page, "2026-09-03T13:59:00-03:00");
    await checkInPage.open();
    await page
      .getByRole("listitem")
      .first()
      .getByRole("button", { name: "Check-in" })
      .click();

    await checkInPage.authorizeEarly();
    await expect(checkInPage.confirmButton()).toBeEnabled();
    await checkInPage.confirm();

    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("às 14h00 em ponto: sem alerta, check-in direto", async ({
    page,
    checkInPage,
  }) => {
    await freezeAt(page, "2026-09-03T14:00:00-03:00");
    await checkInPage.open();
    await page
      .getByRole("listitem")
      .first()
      .getByRole("button", { name: "Check-in" })
      .click();

    await expect(checkInPage.earlyCheckInAlert()).toHaveCount(0);
    await expect(checkInPage.confirmButton()).toBeEnabled();
  });

  test("relógio do navegador adiantado: o servidor recusa e a tela explica", async ({
    page,
    checkInPage,
  }) => {
    await page.clock.setFixedTime(new Date("2026-09-03T14:00:00-03:00"));
    await page
      .context()
      .setExtraHTTPHeaders({ "X-E2E-Now": "2026-09-03T13:30:00-03:00" });

    await checkInPage.open();
    await page
      .getByRole("listitem")
      .first()
      .getByRole("button", { name: "Check-in" })
      .click();
    await expect(checkInPage.earlyCheckInAlert()).toHaveCount(0);
    await checkInPage.confirm();

    await expect(page.getByText(/permitido a partir das 14h00/)).toBeVisible();
  });
});

test.describe("data do check-in", () => {
  test.beforeEach(async ({ seedScenario }) => {
    await seedScenario("future-arrival");
  });

  test("reserva que começa daqui a dois dias não faz check-in hoje", async ({
    page,
    checkInPage,
  }) => {
    await freezeAt(page, "2026-09-03T15:00:00-03:00");
    await checkInPage.open();
    await page.getByRole("button", { name: "Todas", exact: true }).click();
    await checkInPage.openDialogFor("Carla Futura");

    await expect(
      checkInPage.dialog().getByText(/só pode ser feito a partir de 05\/09\/2026/),
    ).toBeVisible();
    await expect(checkInPage.confirmButton()).toBeDisabled();
  });

  test("a API também recusa, mesmo com autorização antecipada", async ({ page }) => {
    await freezeAt(page, "2026-09-03T15:00:00-03:00");
    await page.goto("/check-in");
    const response = await page.evaluate(async (apiUrl) => {
      const csrf = document.cookie.match(/csrftoken=([^;]+)/)?.[1] ?? "";
      const now = "2026-09-03T15:00:00-03:00";
      const pending = await fetch(`${apiUrl}/reservations/arrivals/?scope=all_pending`, {
        credentials: "include",
        headers: { "X-E2E-Now": now },
      }).then((r) => r.json());
      const id = pending.results[0].id;
      const result = await fetch(`${apiUrl}/reservations/${id}/check-in/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrf,
          "X-E2E-Now": now,
        },
        body: JSON.stringify({ authorize_early: true }),
      });
      return { status: result.status, body: await result.json() };
    }, API_BASE_URL);

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("check_in_before_reserved_date");
  });
});

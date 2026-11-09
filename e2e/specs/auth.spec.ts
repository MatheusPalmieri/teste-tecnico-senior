import { expect, test } from "../fixtures/test";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Autenticação", () => {
  test.beforeEach(async ({ seedScenario }) => {
    await seedScenario("empty");
  });

  test("login com credenciais válidas entra e cai no dashboard", async ({
    page,
    loginPage,
  }) => {
    await loginPage.open();
    await loginPage.login("atendente@hotel.com", "senha123");
    await expect(page).toHaveURL("/");
  });

  test("credenciais inválidas mostram mensagem genérica e não entram", async ({
    loginPage,
  }) => {
    await loginPage.open();
    await loginPage.login("atendente@hotel.com", "senha-errada");
    await expect(loginPage.genericError()).toContainText("inválidos");
    await loginPage.expectLoggedOut();
  });

  test("rota protegida sem sessão redireciona para /login", async ({ page }) => {
    await page.goto("/hospedes");
    await expect(page).toHaveURL(/\/login\?next=%2Fhospedes/);
  });

  test("depois do login, volta para a rota que o usuário tentou abrir", async ({
    page,
    loginPage,
  }) => {
    await page.goto("/hospedes");
    await loginPage.login("atendente@hotel.com", "senha123");
    await expect(page).toHaveURL("/hospedes");
  });

  test("nenhum token aparece no localStorage durante a jornada", async ({
    page,
    loginPage,
  }) => {
    await loginPage.open();
    await loginPage.login("atendente@hotel.com", "senha123");
    await expect(page).toHaveURL("/");

    const localStorageDump = await page.evaluate(() =>
      JSON.stringify(window.localStorage),
    );
    expect(localStorageDump).not.toMatch(/access|refresh|token/i);
  });

  test("os cookies de sessão chegam marcados como HttpOnly", async ({
    page,
    loginPage,
    context,
  }) => {
    await loginPage.open();
    await loginPage.login("atendente@hotel.com", "senha123");
    await expect(page).toHaveURL("/");

    const cookies = await context.cookies();
    const sessionCookies = cookies.filter(
      (c) => c.name === "access_token" || c.name === "refresh_token",
    );
    expect(sessionCookies.length).toBeGreaterThan(0);
    for (const cookie of sessionCookies) {
      expect(cookie.httpOnly).toBe(true);
    }
  });

  test("logout volta para /login e a rota protegida não abre mais", async ({
    page,
    loginPage,
    appShellPage,
  }) => {
    await loginPage.open();
    await loginPage.login("atendente@hotel.com", "senha123");
    await expect(page).toHaveURL("/");

    await appShellPage.logout();
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/hospedes");
    await expect(page).toHaveURL(/\/login/);
  });
});

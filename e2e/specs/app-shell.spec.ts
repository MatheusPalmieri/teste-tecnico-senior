import { expect, test } from "../fixtures/test";

test.describe("Estrutura da aplicação", () => {
  test.beforeEach(async ({ seedScenario }) => {
    await seedScenario("empty");
  });

  test("a navegação lateral chega a todas as rotas", async ({ page, appShellPage }) => {
    await page.goto("/");

    await appShellPage.goTo("Hóspedes");
    await expect(page).toHaveURL("/hospedes");

    await appShellPage.goTo("Reservas");
    await expect(page).toHaveURL("/reservas");

    await appShellPage.goTo("Check-in");
    await expect(page).toHaveURL("/check-in");

    await appShellPage.goTo("Check-out");
    await expect(page).toHaveURL("/check-out");

    await appShellPage.goTo("Dashboard");
    await expect(page).toHaveURL("/");
  });

  test("o menu do usuário leva a Configurações", async ({ page, appShellPage }) => {
    await page.goto("/");
    await appShellPage.openUserMenu();
    await page.getByRole("menuitem", { name: "Configurações" }).click();
    await expect(page).toHaveURL(/\/configuracoes/);
  });

  test("F5 numa rota protegida mantém a sessão, sem piscar a tela de login", async ({
    page,
  }) => {
    await page.goto("/hospedes");
    await page.reload();
    await expect(page).toHaveURL("/hospedes");
  });
});

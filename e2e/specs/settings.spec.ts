import { expect, test } from "../fixtures/test";

test.describe("Configurações", () => {
  test.beforeEach(async ({ seedScenario }) => {
    await seedScenario("empty");
  });

  test("mudar o nome reflete na barra lateral na hora", async ({
    page,
    settingsPage,
  }) => {
    await settingsPage.open();
    await settingsPage.updateName("Atendente Renomeado");

    await expect(page.getByRole("button", { name: /Atendente Renomeado/ })).toBeVisible();
  });

  test("o dialog de troca de senha bloqueia confirmação divergente", async ({
    page,
    settingsPage,
  }) => {
    await settingsPage.open();
    await settingsPage.changePassword("nova-senha-forte", "outra-coisa");

    await expect(page.getByText(/senhas não coincidem/i)).toBeVisible();
  });
});

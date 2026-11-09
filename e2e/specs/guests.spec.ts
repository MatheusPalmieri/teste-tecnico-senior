import { expect, test } from "../fixtures/test";

test.describe("Hóspedes", () => {
  test.beforeEach(async ({ seedScenario }) => {
    await seedScenario("search-fixtures");
  });

  test("cadastrar um hóspede pelo dialog o mostra na tabela", async ({
    page,
    guestsPage,
  }) => {
    await guestsPage.open();
    await guestsPage.openCreateDialog();
    await guestsPage.fillForm({
      name: "Carlos Eduardo Pires",
      document: "44455566619",
      phone: "11955554444",
    });
    await guestsPage.submitCreate();

    await guestsPage.expectListed("Carlos Eduardo Pires");
  });

  test("o formulário bloqueia o envio sem nome, documento ou telefone", async ({
    guestsPage,
  }) => {
    await guestsPage.open();
    await guestsPage.openCreateDialog();
    await guestsPage.submitCreate();

    await expect(guestsPage.dialog()).toBeVisible();
  });

  test("documento duplicado mostra erro no campo de documento", async ({
    page,
    guestsPage,
  }) => {
    await guestsPage.open();
    await guestsPage.openCreateDialog();
    await guestsPage.fillForm({
      name: "Outro Hóspede",
      document: "11122233396",
      phone: "11900001111",
    });
    await guestsPage.submitCreate();

    await expect(
      guestsPage.dialog().getByText(/já existe um hóspede com este documento/i),
    ).toBeVisible();
  });

  test("buscar pelo nome sem acento acha o nome acentuado", async ({
    page,
    guestsPage,
  }) => {
    await guestsPage.open();
    await page.getByRole("searchbox").fill("Jose");
    await guestsPage.expectListed("José Antônio Silva");
  });

  test("buscar pelo documento com máscara acha o mesmo hóspede", async ({
    page,
    guestsPage,
  }) => {
    await guestsPage.open();
    await page.getByRole("searchbox").fill("111.222.333-96");
    await guestsPage.expectListed("José Antônio Silva");
  });
});

import { expect, test } from "../fixtures/test";
import { freezeAt } from "../support/clock";

test.describe("regra das 12h00", () => {
  test.beforeEach(async ({ seedScenario }) => {
    await seedScenario("canonical-stay");
  });

  test("às 11h59: sem alerta e sem linha de multa", async ({ page, checkOutPage }) => {
    await freezeAt(page, "2026-09-06T11:59:00-03:00");
    await checkOutPage.open();
    await checkOutPage.openDialogFor("José Antônio Silva");

    await expect(checkOutPage.lateCheckOutAlert()).toHaveCount(0);
    await expect(checkOutPage.dialog().getByText("Multa de late check-out")).toHaveCount(
      0,
    );
    await expect(checkOutPage.totalAmount()).toHaveText(/470,00/);
  });

  test("às 12h00 em ponto: sem multa", async ({ page, checkOutPage }) => {
    await freezeAt(page, "2026-09-06T12:00:00-03:00");
    await checkOutPage.open();
    await checkOutPage.openDialogFor("José Antônio Silva");

    await expect(checkOutPage.lateCheckOutAlert()).toHaveCount(0);
    await expect(checkOutPage.totalAmount()).toHaveText(/470,00/);
  });

  test("às 14h30 de domingo: multa de R$ 90,00 e total de R$ 560,00", async ({
    page,
    checkOutPage,
  }) => {
    await freezeAt(page, "2026-09-06T14:30:00-03:00");
    await checkOutPage.open();
    await checkOutPage.openDialogFor("José Antônio Silva");

    await expect(checkOutPage.lateCheckOutAlert()).toBeVisible();
    await expect(checkOutPage.chargeLine("Multa de late check-out")).toContainText(
      "90,00",
    );
    await expect(checkOutPage.totalAmount()).toHaveText(/560,00/);
  });

  test("saindo um dia antes às 23h46: sem multa, o período contratado é cobrado", async ({
    page,
    checkOutPage,
  }) => {
    await freezeAt(page, "2026-09-05T23:46:00-03:00");
    await checkOutPage.open();
    await checkOutPage.selectScope("Todas");
    await checkOutPage.openDialogFor("José Antônio Silva");

    await expect(checkOutPage.lateCheckOutAlert()).toHaveCount(0);
    await expect(checkOutPage.dialog().getByText("Multa de late check-out")).toHaveCount(
      0,
    );
    await expect(checkOutPage.totalAmount()).toHaveText(/470,00/);
  });
});

test.describe("total exibido x total cobrado", () => {
  test.beforeEach(async ({ seedScenario }) => {
    await seedScenario("canonical-stay");
  });

  test("passar das 12h00 entre o preview e a confirmação mostra o novo total em vez de cobrá-lo", async ({
    page,
    checkOutPage,
  }) => {
    await freezeAt(page, "2026-09-06T11:59:00-03:00");
    await checkOutPage.open();
    await checkOutPage.openDialogFor("José Antônio Silva");
    await expect(checkOutPage.totalAmount()).toHaveText(/470,00/);

    await freezeAt(page, "2026-09-06T12:01:00-03:00");
    await checkOutPage.confirmCheckOut();

    await expect(
      checkOutPage.dialog().getByText(/O valor do check-out mudou/),
    ).toBeVisible();
    await expect(checkOutPage.totalAmount()).toHaveText(/560,00/);
    await expect(checkOutPage.dialog().getByText("Recibo")).toHaveCount(0);
  });
});

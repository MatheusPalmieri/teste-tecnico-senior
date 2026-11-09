import { expect, test } from "../fixtures/test";
import { freezeAt } from "../support/clock";

test.describe("Check-out", () => {
  test.beforeEach(async ({ seedScenario }) => {
    await seedScenario("canonical-stay");
  });

  test("o dialog mostra o detalhamento e o total bate com a soma", async ({
    page,
    checkOutPage,
  }) => {
    await freezeAt(page, "2026-09-06T11:00:00-03:00");
    await checkOutPage.open();
    await checkOutPage.openDialogFor("José Antônio Silva");

    await expect(checkOutPage.chargeLine("Subtotal de diárias")).toBeVisible();
    await expect(checkOutPage.chargeLine("Subtotal de vaga")).toBeVisible();
    await expect(checkOutPage.totalAmount()).toHaveText(/470,00/);
  });

  test("um clique não conclui; dois concluem e abrem o recibo", async ({
    page,
    checkOutPage,
  }) => {
    await freezeAt(page, "2026-09-06T14:30:00-03:00");
    await checkOutPage.open();
    await checkOutPage.openDialogFor("José Antônio Silva");

    await checkOutPage.confirmButton().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(1);

    await checkOutPage.confirmCheckOut();

    await expect(page.getByRole("dialog").getByText("Recibo")).toBeVisible();
    await expect(page.getByRole("dialog").getByText(/560,00/)).toBeVisible();
  });

  test("depois do check-out, o hóspede sai da fila de saídas", async ({
    page,
    checkOutPage,
  }) => {
    await freezeAt(page, "2026-09-06T14:30:00-03:00");
    await checkOutPage.open();
    await checkOutPage.openDialogFor("José Antônio Silva");
    await checkOutPage.confirmCheckOut();

    await checkOutPage.expectQueueEmpty("José Antônio Silva");
  });
});

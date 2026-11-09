import { expect, test } from "../fixtures/test";
import { freezeAt } from "../support/clock";

test("jornada completa: cadastro, reserva, check-in e check-out com multa", async ({
  page,
  seedScenario,
  guestsPage,
  reservationsPage,
  checkInPage,
  checkOutPage,
}) => {
  await seedScenario("empty");
  await freezeAt(page, "2026-09-01T09:00:00-03:00");

  await guestsPage.open();
  await guestsPage.openCreateDialog();
  await guestsPage.fillForm({
    name: "José Antônio Silva",
    document: "12345678909",
    phone: "11988887777",
  });
  await guestsPage.submitCreate();
  await guestsPage.expectListed("José Antônio Silva");

  await reservationsPage.open();
  await reservationsPage.openCreateDialog();
  await reservationsPage.selectGuest("José Antônio Silva");
  await reservationsPage.fillDates("2026-09-03", "2026-09-06");
  await reservationsPage.selectRoom("101");
  await reservationsPage.toggleParking();
  await expect(reservationsPage.totalAmount()).toHaveText(/470,00/);
  await reservationsPage.submit();
  await reservationsPage.expectStatusBadge("José Antônio Silva", "Reservada");

  await freezeAt(page, "2026-09-03T15:00:00-03:00");
  await checkInPage.open();
  await page
    .getByRole("listitem")
    .filter({ hasText: "José Antônio Silva" })
    .getByRole("button", { name: "Check-in" })
    .click();
  await checkInPage.confirm();
  await checkInPage.expectQueueEmpty("José Antônio Silva");

  await guestsPage.open();
  await expect(
    page.getByRole("row").filter({ hasText: "José Antônio Silva" }).getByText("No hotel"),
  ).toBeVisible();

  await freezeAt(page, "2026-09-06T14:30:00-03:00");
  await checkOutPage.open();
  await checkOutPage.openDialogFor("José Antônio Silva");

  await expect(checkOutPage.chargeLine("Subtotal de diárias")).toContainText("420,00");
  await expect(checkOutPage.chargeLine("Subtotal de vaga")).toContainText("50,00");
  await expect(checkOutPage.chargeLine("Multa de late check-out")).toContainText("90,00");
  await expect(checkOutPage.totalAmount()).toHaveText(/560,00/);

  await checkOutPage.confirmCheckOut();
  await expect(page.getByRole("dialog").getByText("Recibo")).toBeVisible();
  await expect(page.getByRole("dialog").getByText(/560,00/)).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Fechar" }).first().click();

  await reservationsPage.open();
  await reservationsPage.openHistory();
  await reservationsPage.expectStatusBadge("José Antônio Silva", "Finalizada");

  await guestsPage.open();
  await expect(
    page.getByRole("row").filter({ hasText: "José Antônio Silva" }).getByText("No hotel"),
  ).toHaveCount(0);
});

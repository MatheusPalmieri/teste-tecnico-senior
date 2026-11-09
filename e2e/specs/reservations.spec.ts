import { expect, test } from "../fixtures/test";
import { freezeAt } from "../support/clock";

test.describe("Reservas", () => {
  test.beforeEach(async ({ seedScenario }) => {
    await seedScenario("search-fixtures");
  });

  test("criar uma reserva pelo dialog, com a estimativa correta", async ({
    page,
    reservationsPage,
  }) => {
    await freezeAt(page, "2026-09-01T09:00:00-03:00");
    await reservationsPage.open();
    await reservationsPage.openCreateDialog();
    await reservationsPage.selectGuest("José Antônio Silva");
    await reservationsPage.fillDates("2026-09-03", "2026-09-06");
    await reservationsPage.selectRoom("101");
    await reservationsPage.toggleParking();

    await expect(reservationsPage.totalAmount()).toHaveText(/470,00/);

    await reservationsPage.submit();
    await reservationsPage.expectStatusBadge("José Antônio Silva", "Reservada");
  });

  test("o seletor de saída bloqueia qualquer dia até a data de entrada", async ({
    page,
    reservationsPage,
  }) => {
    await freezeAt(page, "2026-09-01T09:00:00-03:00");
    await reservationsPage.open();
    await reservationsPage.openCreateDialog();
    await reservationsPage.selectGuest("José Antônio Silva");
    await reservationsPage.pickCheckIn("2026-09-06");

    await reservationsPage.expectCheckOutDayDisabled("2026-09-03");
    await reservationsPage.expectCheckOutDayDisabled("2026-09-06");

    await expect(reservationsPage.dialog()).toBeVisible();
  });

  test("cancelar uma reserva pede confirmação e muda o badge para Cancelada", async ({
    page,
    reservationsPage,
  }) => {
    await freezeAt(page, "2026-09-01T09:00:00-03:00");
    await reservationsPage.open();
    await reservationsPage.openCreateDialog();
    await reservationsPage.selectGuest("José Antônio Silva");
    await reservationsPage.fillDates("2026-09-10", "2026-09-12");
    await reservationsPage.selectRoom("102");
    await reservationsPage.submit();
    await reservationsPage.expectStatusBadge("José Antônio Silva", "Reservada");

    await reservationsPage.cancelReservation("José Antônio Silva");

    await expect(
      page.getByRole("row").filter({ hasText: "José Antônio Silva" }),
    ).toHaveCount(0);
    await reservationsPage.openHistory();
    await expect(
      page
        .getByRole("row")
        .filter({ hasText: "José Antônio Silva" })
        .getByText("Cancelada"),
    ).toBeVisible();
  });
});

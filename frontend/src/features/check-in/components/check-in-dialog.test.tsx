import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

import { server } from "@/test/msw/server";
import { fireEvent, renderWithProviders, screen, waitFor, within } from "@/test/utils";

import { CheckInDialog } from "./check-in-dialog";

const API_URL = "http://localhost:8000/api";

vi.mock("@/shared/lib/date", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/lib/date")>()),
  todayIsoDate: () => "2026-09-04",
}));

const { allowedRef } = vi.hoisted(() => ({ allowedRef: { current: true } }));
vi.mock("../lib/check-in-window", () => ({
  isCheckInAllowed: () => allowedRef.current,
}));

function withClock(allowed: boolean): void {
  allowedRef.current = allowed;
}

async function openDialog(onOpenChange = vi.fn(), onSuccess?: () => void) {
  renderWithProviders(
    <CheckInDialog
      reservationId="r1"
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
    />,
    { withAuth: false },
  );
  const dialog = await screen.findByRole("dialog");
  await waitFor(() =>
    expect(within(dialog).getByText("Jose Antonio Silva")).toBeInTheDocument(),
  );
  return { dialog, onOpenChange };
}

describe("CheckInDialog", () => {
  it("não abre enquanto não há reserva selecionada", () => {
    withClock(true);
    renderWithProviders(<CheckInDialog reservationId={null} onOpenChange={() => {}} />, {
      withAuth: false,
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("mostra o resumo da reserva antes de confirmar", async () => {
    withClock(true);
    const { dialog } = await openDialog();

    expect(within(dialog).getByText("12345678900")).toBeInTheDocument();
    expect(within(dialog).getByText("(11) 98888-7777")).toBeInTheDocument();
    expect(within(dialog).getByText("204")).toBeInTheDocument();
    expect(within(dialog).getByText("03/09/2026 - 06/09/2026")).toBeInTheDocument();
  });

  it("depois das 14h, confirma sem aviso nem autorização", async () => {
    withClock(true);
    const { dialog } = await openDialog();

    expect(
      within(dialog).queryByText("Check-in previsto a partir das 14h00"),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByLabelText("Autorizar check-in antecipado"),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Confirmar check-in" }),
    ).toBeEnabled();
  });

  it("antes das 14h, o aviso aparece e a confirmação fica travada", async () => {
    withClock(false);
    const { dialog } = await openDialog();

    expect(
      within(dialog).getByText("Check-in previsto a partir das 14h00"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Confirmar check-in" }),
    ).toBeDisabled();
  });

  it("autorizar o antecipado destrava a confirmação", async () => {
    withClock(false);
    const { dialog } = await openDialog();

    fireEvent.click(within(dialog).getByRole("checkbox", { name: /Autorizar/ }));

    expect(
      within(dialog).getByRole("button", { name: "Confirmar check-in" }),
    ).toBeEnabled();
  });

  it("antes da data de entrada da reserva, explica e trava a confirmação", async () => {
    withClock(false);
    server.use(
      http.get(`${API_URL}/reservations/:id/`, () =>
        HttpResponse.json({
          id: "r1",
          code: "R-0001",
          guest: {
            id: "g1",
            name: "Jose Antonio Silva",
            document: "12345678900",
            phone: "11988887777",
          },
          status: "RESERVED",
          check_in_date: "2099-01-10",
          check_out_date: "2099-01-12",
          room: "204",
          uses_parking: false,
          vehicle_plate: "",
          notes: "",
        }),
      ),
    );
    const { dialog } = await openDialog();

    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "O check-in só pode ser feito a partir de 10/01/2099",
    );
    expect(
      within(dialog).queryByRole("checkbox", { name: /Autorizar/ }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Confirmar check-in" }),
    ).toBeDisabled();
  });

  it("depois do fim do período da reserva, explica e trava a confirmação", async () => {
    withClock(false);
    server.use(
      http.get(`${API_URL}/reservations/:id/`, () =>
        HttpResponse.json({
          id: "r1",
          code: "R-0001",
          guest: {
            id: "g1",
            name: "Jose Antonio Silva",
            document: "12345678900",
            phone: "11988887777",
          },
          status: "RESERVED",
          check_in_date: "2020-01-10",
          check_out_date: "2020-01-12",
          room: "204",
          uses_parking: false,
          vehicle_plate: "",
          notes: "",
        }),
      ),
    );
    const { dialog } = await openDialog();

    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "O período desta reserva terminou em 12/01/2020",
    );
    expect(
      within(dialog).queryByRole("checkbox", { name: /Autorizar/ }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Confirmar check-in" }),
    ).toBeDisabled();
  });

  it("manda a autorização e a vaga escolhidas para a API", async () => {
    withClock(false);
    let body: unknown;
    server.use(
      http.post(`${API_URL}/reservations/:id/check-in/`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: "r1", status: "CHECKED_IN" });
      }),
    );
    const { dialog, onOpenChange } = await openDialog();

    fireEvent.click(within(dialog).getByRole("checkbox", { name: /Autorizar/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar check-in" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(body).toEqual({ authorize_early: true, uses_parking: true });
  });

  it("a vaga vem marcada conforme a reserva e pode ser desmarcada", async () => {
    withClock(true);
    let body: unknown;
    server.use(
      http.post(`${API_URL}/reservations/:id/check-in/`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: "r1", status: "CHECKED_IN" });
      }),
    );
    const { dialog } = await openDialog();

    const parking = within(dialog).getByRole("checkbox", { name: "Usa vaga de carro" });
    expect(parking).toBeChecked();

    fireEvent.click(parking);
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar check-in" }));

    await waitFor(() =>
      expect(body).toEqual({ authorize_early: false, uses_parking: false }),
    );
  });

  it("sucesso avisa o chamador e notifica a tela", async () => {
    withClock(true);
    const success = vi.spyOn(toast, "success");
    const onSuccess = vi.fn();
    const { dialog, onOpenChange } = await openDialog(vi.fn(), onSuccess);

    fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar check-in" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(onSuccess).toHaveBeenCalled();
    expect(success).toHaveBeenCalledWith("Check-in realizado.");
    success.mockRestore();
  });

  it("com o relógio do cliente adiantado, a recusa do servidor aparece na tela", async () => {
    withClock(true);
    server.use(
      http.post(`${API_URL}/reservations/:id/check-in/`, () =>
        HttpResponse.json(
          {
            detail: "Check-in só é permitido a partir das 14h00.",
            code: "early_check_in_not_authorized",
          },
          { status: 409 },
        ),
      ),
    );
    const { dialog, onOpenChange } = await openDialog();

    fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar check-in" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Check-in só é permitido a partir das 14h00.",
    );
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("antes das 14h, a mensagem do servidor substitui o texto do aviso", async () => {
    withClock(false);
    server.use(
      http.post(`${API_URL}/reservations/:id/check-in/`, () =>
        HttpResponse.json(
          { detail: "Quarto ainda em limpeza.", code: "room_not_ready" },
          { status: 409 },
        ),
      ),
    );
    const { dialog } = await openDialog();

    fireEvent.click(within(dialog).getByRole("checkbox", { name: /Autorizar/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar check-in" }));

    expect(
      await within(dialog).findByText("Quarto ainda em limpeza."),
    ).toBeInTheDocument();
  });

  it("cancelar fecha sem chamar a API", async () => {
    withClock(true);
    const { dialog, onOpenChange } = await openDialog();

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("erro ao carregar a reserva oferece repetir", async () => {
    withClock(true);
    let attempts = 0;
    server.use(
      http.get(`${API_URL}/reservations/:id/`, () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json(
              { detail: "Erro interno.", code: "server_error" },
              { status: 500 },
            )
          : HttpResponse.json({
              id: "r1",
              code: "R-0001",
              guest: {
                id: "g1",
                name: "Jose Antonio Silva",
                document: "12345678900",
                phone: "11988887777",
              },
              status: "RESERVED",
              check_in_date: "2026-09-03",
              check_out_date: "2026-09-06",
              room: "204",
              uses_parking: true,
              vehicle_plate: "",
              notes: "",
              checked_in_at: null,
              checked_out_at: null,
              early_check_in_authorized: false,
              total_amount: null,
              charges_snapshot: null,
              estimated_total: "470.00",
              created_at: "2026-09-01T00:00:00Z",
            });
      }),
    );
    renderWithProviders(<CheckInDialog reservationId="r1" onOpenChange={vi.fn()} />, {
      withAuth: false,
    });
    const dialog = await screen.findByRole("dialog");

    fireEvent.click(
      await within(dialog).findByRole("button", { name: "Tentar novamente" }),
    );

    await waitFor(() =>
      expect(within(dialog).getByText("Jose Antonio Silva")).toBeInTheDocument(),
    );
  });
});

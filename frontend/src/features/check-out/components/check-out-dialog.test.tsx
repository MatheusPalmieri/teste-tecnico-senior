import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";

import { server } from "@/test/msw/server";
import { renderWithProviders, screen, waitFor, within } from "@/test/utils";

import { CheckOutDialog } from "./check-out-dialog";

describe("CheckOutDialog", () => {
  it("mostra exatamente dois botões no rodapé, sem campo de pagamento", async () => {
    renderWithProviders(<CheckOutDialog reservationId="r2" onOpenChange={() => {}} />, {
      withAuth: false,
    });
    const dialog = await screen.findByRole("dialog");
    await waitFor(() =>
      expect(within(dialog).getByText("Total geral")).toBeInTheDocument(),
    );

    const footer = within(dialog).getByRole("button", {
      name: "Fazer check-out",
    }).parentElement;
    expect(footer?.querySelectorAll("button")).toHaveLength(2);
  });

  it("mostra o detalhamento antes de permitir a confirmação", async () => {
    renderWithProviders(<CheckOutDialog reservationId="r2" onOpenChange={() => {}} />, {
      withAuth: false,
    });
    const dialog = await screen.findByRole("dialog");
    await waitFor(() =>
      expect(within(dialog).getByText("R$ 510,00")).toBeInTheDocument(),
    );
  });

  it("o primeiro clique arma o botão sem chamar a API", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CheckOutDialog reservationId="r2" onOpenChange={() => {}} />, {
      withAuth: false,
    });
    const dialog = await screen.findByRole("dialog");
    await waitFor(() =>
      expect(within(dialog).getByText("Total geral")).toBeInTheDocument(),
    );

    await user.click(within(dialog).getByRole("button", { name: "Fazer check-out" }));
    expect(
      within(dialog).getByRole("button", { name: "Confirmar check-out" }),
    ).toBeInTheDocument();
  });

  it("o segundo clique, depois da janela de proteção, faz o check-out", async () => {
    const user = userEvent.setup({ delay: null });
    const onOpenChange = vi.fn();
    renderWithProviders(
      <CheckOutDialog reservationId="r2" onOpenChange={onOpenChange} />,
      {
        withAuth: false,
      },
    );
    const dialog = await screen.findByRole("dialog");
    await waitFor(() =>
      expect(within(dialog).getByText("Total geral")).toBeInTheDocument(),
    );

    await user.click(within(dialog).getByRole("button", { name: "Fazer check-out" }));
    await new Promise((resolve) => setTimeout(resolve, 350));
    await user.click(within(dialog).getByRole("button", { name: "Confirmar check-out" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("reabrir o dialog sempre começa desarmado", async () => {
    const { rerender } = renderWithProviders(
      <CheckOutDialog reservationId="r2" onOpenChange={() => {}} />,
      { withAuth: false },
    );
    const dialog = await screen.findByRole("dialog");
    await waitFor(() =>
      expect(within(dialog).getByText("Total geral")).toBeInTheDocument(),
    );
    const user = userEvent.setup();
    await user.click(within(dialog).getByRole("button", { name: "Fazer check-out" }));
    expect(
      within(dialog).getByRole("button", { name: "Confirmar check-out" }),
    ).toBeInTheDocument();

    rerender(<CheckOutDialog reservationId={null} onOpenChange={() => {}} />);
    rerender(<CheckOutDialog reservationId="r2" onOpenChange={() => {}} />);

    const reopened = await screen.findByRole("dialog");
    await waitFor(() =>
      expect(within(reopened).getByText("Total geral")).toBeInTheDocument(),
    );
    expect(
      within(reopened).getByRole("button", { name: "Fazer check-out" }),
    ).toBeInTheDocument();
  });

  describe("regressions", () => {
    const API_URL = "http://localhost:8000/api";

    async function confirmCheckOut(user: ReturnType<typeof userEvent.setup>) {
      const dialog = await screen.findByRole("dialog");
      await waitFor(() =>
        expect(within(dialog).getByText("R$ 510,00")).toBeInTheDocument(),
      );
      await user.click(within(dialog).getByRole("button", { name: "Fazer check-out" }));
      await new Promise((resolve) => setTimeout(resolve, 350));
      await user.click(
        within(dialog).getByRole("button", { name: "Confirmar check-out" }),
      );
      return dialog;
    }

    it("envia o total exibido no preview como expected_total", async () => {
      let body: unknown;
      server.use(
        http.post(`${API_URL}/reservations/:id/check-out/`, async ({ request }) => {
          body = await request.json();
          return HttpResponse.json({ id: "r2", status: "CHECKED_OUT" });
        }),
      );
      const user = userEvent.setup({ delay: null });
      const onOpenChange = vi.fn();
      renderWithProviders(
        <CheckOutDialog reservationId="r2" onOpenChange={onOpenChange} />,
        {
          withAuth: false,
        },
      );

      await confirmCheckOut(user);

      await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
      expect(body).toEqual({ expected_total: "510.00" });
    });

    it("se o total mudou, mostra a mensagem e recarrega o novo total", async () => {
      let previewCalls = 0;
      server.use(
        http.post(`${API_URL}/reservations/:id/check-out/`, () =>
          HttpResponse.json(
            {
              detail:
                "O valor do check-out mudou desde que foi exibido. Confira o novo total.",
              code: "check_out_total_changed",
              context: { expected_total: "510.00", total: "600.00" },
            },
            { status: 409 },
          ),
        ),
        http.get(`${API_URL}/reservations/:id/check-out-preview/`, () => {
          previewCalls += 1;
          return HttpResponse.json({
            nights: 3,
            lines: [],
            nightly_subtotal: "420.00",
            parking_subtotal: "0.00",
            late_check_out_fee: "90.00",
            total: previewCalls === 1 ? "510.00" : "600.00",
            is_late_check_out: true,
            check_out_deadline: "12:00",
            current_time: "14:30",
          });
        }),
      );
      const user = userEvent.setup({ delay: null });
      const onOpenChange = vi.fn();
      renderWithProviders(
        <CheckOutDialog reservationId="r2" onOpenChange={onOpenChange} />,
        {
          withAuth: false,
        },
      );

      const dialog = await confirmCheckOut(user);

      expect(
        await within(dialog).findByText(/O valor do check-out mudou/),
      ).toBeInTheDocument();
      expect(await within(dialog).findByText("R$ 600,00")).toBeInTheDocument();
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
    });

    it("o botão de tentar novamente refaz o preview que falhou", async () => {
      let previewCalls = 0;
      server.use(
        http.get(`${API_URL}/reservations/:id/check-out-preview/`, () => {
          previewCalls += 1;
          return HttpResponse.json({ detail: "erro", code: "error" }, { status: 500 });
        }),
      );
      const user = userEvent.setup();
      renderWithProviders(<CheckOutDialog reservationId="r2" onOpenChange={() => {}} />, {
        withAuth: false,
      });

      const retry = await screen.findByRole("button", { name: "Tentar novamente" });
      const callsBefore = previewCalls;
      await user.click(retry);

      await waitFor(() => expect(previewCalls).toBeGreaterThan(callsBefore));
    });
  });
});

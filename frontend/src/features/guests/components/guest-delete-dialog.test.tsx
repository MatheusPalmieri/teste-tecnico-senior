import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";

import { server } from "@/test/msw/server";
import { renderWithProviders, screen, waitFor } from "@/test/utils";

import { GuestDeleteDialog } from "./guest-delete-dialog";

import type { Guest } from "../api/types";

const API_URL = "http://localhost:8000/api";

const GUEST: Guest = {
  id: "g1",
  name: "Jose Antonio Silva",
  document_type: "CPF",
  document: "12345678900",
  phone: "11988887777",
  email: "",
  notes: "",
  current_status: null,
  current_reservation: null,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

function renderDialog(guest: Guest | null, onOpenChange = vi.fn()) {
  renderWithProviders(<GuestDeleteDialog guest={guest} onOpenChange={onOpenChange} />, {
    withAuth: false,
  });
  return onOpenChange;
}

describe("GuestDeleteDialog", () => {
  it("não abre enquanto não há hóspede selecionado", () => {
    renderDialog(null);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("exclusão passa por AlertDialog de confirmação nomeando o hóspede", async () => {
    renderDialog(GUEST);

    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Tem certeza que deseja excluir Jose Antonio Silva? Esta ação não pode ser desfeita.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir" })).toBeEnabled();
  });

  it("confirmada, exclui e fecha o dialog", async () => {
    const user = userEvent.setup();
    server.use(
      http.delete(
        `${API_URL}/guests/:id/`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    const onOpenChange = renderDialog(GUEST);

    await user.click(await screen.findByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it.each([
    [
      "CHECKED_IN",
      "Este hóspede está hospedado agora. Finalize o check-out antes de excluir.",
    ],
    [
      "RESERVED",
      "Este hóspede tem uma reserva aguardando check-in. Cancele a reserva antes de excluir.",
    ],
  ] as const)(
    "hóspede com reserva %s já chega com a confirmação bloqueada",
    async (status, reason) => {
      renderDialog({ ...GUEST, current_status: status });

      expect(await screen.findByText(reason)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Excluir" })).toBeDisabled();
    },
  );

  it("409 do backend mantém o dialog aberto com a mensagem da API", async () => {
    const user = userEvent.setup();
    server.use(
      http.delete(`${API_URL}/guests/:id/`, () =>
        HttpResponse.json(
          {
            detail: "Hóspede possui reserva ativa.",
            code: "guest_has_active_reservation",
          },
          { status: 409 },
        ),
      ),
    );
    const onOpenChange = renderDialog(GUEST);

    await user.click(await screen.findByRole("button", { name: "Excluir" }));

    expect(await screen.findByText("Hóspede possui reserva ativa.")).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("cancelar fecha sem chamar a API", async () => {
    const user = userEvent.setup();
    const onOpenChange = renderDialog(GUEST);

    await user.click(await screen.findByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});

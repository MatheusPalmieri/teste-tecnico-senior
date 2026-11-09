import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";

import { server } from "@/test/msw/server";
import { fireEvent, renderWithProviders, screen, waitFor } from "@/test/utils";

import { RoomSelect } from "./room-select";

const API_URL = "http://localhost:8000/api";

const PERIOD = { checkInDate: "2026-09-03", checkOutDate: "2026-09-06" };

function openSelect(): void {
  fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });
}

describe("RoomSelect", () => {
  it.each([
    ["sem datas", { checkInDate: "", checkOutDate: "" }],
    ["só com a entrada", { checkInDate: "2026-09-03", checkOutDate: "" }],
    [
      "com saída anterior à entrada",
      { checkInDate: "2026-09-06", checkOutDate: "2026-09-03" },
    ],
  ])("%s, o campo fica desabilitado pedindo o período", (_case, period) => {
    renderWithProviders(<RoomSelect value="" onChange={() => {}} {...period} />, {
      withAuth: false,
    });

    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByText("Escolha o período primeiro")).toBeInTheDocument();
  });

  it("enquanto a disponibilidade carrega, o campo fica desabilitado", () => {
    renderWithProviders(<RoomSelect value="" onChange={() => {}} {...PERIOD} />, {
      withAuth: false,
    });

    expect(screen.getByText("Carregando quartos...")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("lista os livres e mostra os ocupados desabilitados, sem escondê-los", async () => {
    renderWithProviders(<RoomSelect value="" onChange={() => {}} {...PERIOD} />, {
      withAuth: false,
    });
    await waitFor(() => expect(screen.getByRole("combobox")).toBeEnabled());

    openSelect();

    expect(await screen.findByRole("option", { name: "101" })).toBeEnabled();
    expect(screen.getByRole("option", { name: "104 (ocupado)" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("escolher um quarto avisa o formulário", async () => {
    const onChange = vi.fn();
    renderWithProviders(<RoomSelect value="" onChange={onChange} {...PERIOD} />, {
      withAuth: false,
    });
    await waitFor(() => expect(screen.getByRole("combobox")).toBeEnabled());

    openSelect();
    fireEvent.click(await screen.findByRole("option", { name: "102" }));

    expect(onChange).toHaveBeenCalledWith("102");
  });

  it("hotel lotado no período troca o campo por um aviso, sem select vazio", async () => {
    server.use(
      http.get(`${API_URL}/rooms/available/`, () =>
        HttpResponse.json({ total_rooms: 15, available: [], occupied: [] }),
      ),
    );
    renderWithProviders(<RoomSelect value="" onChange={() => {}} {...PERIOD} />, {
      withAuth: false,
    });

    expect(
      await screen.findByText("Nenhum quarto disponível no período escolhido"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Os 15 quartos estão ocupados/)).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("na edição, exclui a própria reserva da checagem de disponibilidade", async () => {
    const requested: string[] = [];
    server.use(
      http.get(`${API_URL}/rooms/available/`, ({ request }) => {
        requested.push(
          new URL(request.url).searchParams.get("exclude_reservation") ?? "",
        );
        return HttpResponse.json({
          total_rooms: 15,
          available: ["204"],
          occupied: [],
        });
      }),
    );
    renderWithProviders(
      <RoomSelect
        value="204"
        onChange={() => {}}
        excludeReservationId="r1"
        {...PERIOD}
      />,
      { withAuth: false },
    );

    await waitFor(() => expect(requested).toContain("r1"));
  });
});

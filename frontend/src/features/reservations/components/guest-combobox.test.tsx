import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";

import { server } from "@/test/msw/server";
import { act, fireEvent, renderWithProviders, screen } from "@/test/utils";

import { GuestCombobox } from "./guest-combobox";

const API_URL = "http://localhost:8000/api";

function openCombobox(): void {
  fireEvent.click(screen.getByRole("combobox"));
}

async function pollDom<T>(query: () => T): Promise<T> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      return query();
    } catch {
      await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    }
  }
  return query();
}

describe("GuestCombobox", () => {
  it("fechado, mostra o placeholder quando nenhum hóspede foi escolhido", () => {
    renderWithProviders(<GuestCombobox value="" onSelect={() => {}} />, {
      withAuth: false,
    });

    expect(screen.getByRole("combobox")).toHaveTextContent("Buscar hóspede...");
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
  });

  it("com hóspede escolhido, mostra o nome dele no gatilho", () => {
    renderWithProviders(
      <GuestCombobox value="g1" guestLabel="Jose Antonio Silva" onSelect={() => {}} />,
      { withAuth: false },
    );

    expect(screen.getByRole("combobox")).toHaveTextContent("Jose Antonio Silva");
  });

  it("abre a busca e lista os hóspedes com nome e documento", async () => {
    renderWithProviders(<GuestCombobox value="" onSelect={() => {}} />, {
      withAuth: false,
    });

    openCombobox();

    const option = await pollDom(() => screen.getByText("Jose Antonio Silva"));
    expect(option).toBeInTheDocument();
    expect(screen.getByText("12345678900")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Nome, documento ou telefone"),
    ).toBeInTheDocument();
  });

  it("digitar manda a busca para o servidor (o filtro não e local)", async () => {
    const searches: string[] = [];
    server.use(
      http.get(`${API_URL}/guests/`, ({ request }) => {
        searches.push(new URL(request.url).searchParams.get("search") ?? "");
        return HttpResponse.json({ count: 0, next: null, previous: null, results: [] });
      }),
    );
    renderWithProviders(<GuestCombobox value="" onSelect={() => {}} />, {
      withAuth: false,
    });

    openCombobox();
    fireEvent.change(screen.getByPlaceholderText("Nome, documento ou telefone"), {
      target: { value: "maria" },
    });

    await pollDom(() => expect(searches).toContain("maria"));
  });

  it("busca sem resultado mostra o estado vazio", async () => {
    server.use(
      http.get(`${API_URL}/guests/`, () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    );
    renderWithProviders(<GuestCombobox value="" onSelect={() => {}} />, {
      withAuth: false,
    });

    openCombobox();

    expect(
      await pollDom(() => screen.getByText("Nenhum hóspede encontrado.")),
    ).toBeInTheDocument();
  });

  it("escolher um hóspede devolve id e nome e fecha a lista", async () => {
    const onSelect = vi.fn();
    renderWithProviders(<GuestCombobox value="" onSelect={onSelect} />, {
      withAuth: false,
    });

    openCombobox();
    fireEvent.click(await pollDom(() => screen.getByText("Jose Antonio Silva")));

    expect(onSelect).toHaveBeenCalledWith("g1", "Jose Antonio Silva");
    await pollDom(() =>
      expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false"),
    );
  });
});

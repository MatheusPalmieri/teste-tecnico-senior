import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { server } from "@/test/msw/server";

import { guestsApi } from "./guests-api";

const API_URL = "http://localhost:8000/api";

const EMPTY_PAGE = { count: 0, next: null, previous: null, results: [] };

async function listWith(
  filters: Parameters<typeof guestsApi.list>[0],
): Promise<URLSearchParams> {
  let captured = new URLSearchParams();
  server.use(
    http.get(`${API_URL}/guests/`, ({ request }) => {
      captured = new URL(request.url).searchParams;
      return HttpResponse.json(EMPTY_PAGE);
    }),
  );
  await guestsApi.list(filters);
  return captured;
}

describe("guestsApi.list", () => {
  it("repassa busca, status, estacionamento e paginação", async () => {
    const params = await listWith({
      search: "silva",
      status: "in_house",
      uses_parking: "1",
      page: 3,
      page_size: 25,
    });

    expect(params.get("search")).toBe("silva");
    expect(params.get("status")).toBe("in_house");
    expect(params.get("uses_parking")).toBe("1");
    expect(params.get("page")).toBe("3");
    expect(params.get("page_size")).toBe("25");
  });

  it("filtro vazio não vira parâmetro — a URL da API fica limpa", async () => {
    const params = await listWith({ search: "", status: "", uses_parking: "", page: 1 });

    expect(params.has("search")).toBe(false);
    expect(params.has("status")).toBe(false);
    expect(params.has("uses_parking")).toBe(false);
  });

  it('`sort`/`order` viram o `ordering` do DRF ("-" para descendente)', async () => {
    expect((await listWith({ sort: "name", order: "asc" })).get("ordering")).toBe("name");
    expect((await listWith({ sort: "name", order: "desc" })).get("ordering")).toBe(
      "-name",
    );
  });

  it("sem `order`, a ordenação é ascendente", async () => {
    expect((await listWith({ sort: "created_at" })).get("ordering")).toBe("created_at");
  });

  it("sem `sort`, não manda `ordering`", async () => {
    expect((await listWith({})).has("ordering")).toBe(false);
  });

  it("devolve a página como veio do backend", async () => {
    const page = await guestsApi.list({});

    expect(page.count).toBe(2);
    expect(page.results.map((guest) => guest.name)).toEqual([
      "Jose Antonio Silva",
      "Maria Fernanda",
    ]);
  });
});

describe("guestsApi", () => {
  it("`get` busca o detalhe do hóspede", async () => {
    server.use(
      http.get(`${API_URL}/guests/:id/`, ({ params }) =>
        HttpResponse.json({
          id: params.id,
          name: "Jose Antonio Silva",
          reservations: [],
        }),
      ),
    );

    const guest = await guestsApi.get("g1");

    expect(guest).toMatchObject({ id: "g1", name: "Jose Antonio Silva" });
  });

  it("`create` posta o payload na coleção", async () => {
    const created = await guestsApi.create({
      name: "Novo Hóspede",
      document: "11122233344",
      phone: "11966665555",
    });

    expect(created).toMatchObject({ id: "g3", document: "11122233344" });
  });

  it("`update` usa PATCH no recurso do hóspede", async () => {
    let method = "";
    server.use(
      http.patch(`${API_URL}/guests/:id/`, ({ request }) => {
        method = request.method;
        return HttpResponse.json({ id: "g1", name: "Jose A. Silva" });
      }),
    );

    const updated = await guestsApi.update("g1", {
      name: "Jose A. Silva",
      document: "12345678900",
      phone: "11988887777",
    });

    expect(method).toBe("PATCH");
    expect(updated).toMatchObject({ name: "Jose A. Silva" });
  });

  it("`remove` chama DELETE no recurso do hóspede", async () => {
    let deleted = "";
    server.use(
      http.delete(`${API_URL}/guests/:id/`, ({ params }) => {
        deleted = String(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await guestsApi.remove("g1");

    expect(deleted).toBe("g1");
  });
});

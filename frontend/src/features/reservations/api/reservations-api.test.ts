import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { server } from "@/test/msw/server";

import { reservationsApi } from "./reservations-api";

const API_URL = "http://localhost:8000/api";

const EMPTY_PAGE = { count: 0, next: null, previous: null, results: [] };

async function listWith(
  filters: Parameters<typeof reservationsApi.list>[0],
): Promise<URLSearchParams> {
  let captured = new URLSearchParams();
  server.use(
    http.get(`${API_URL}/reservations/`, ({ request }) => {
      captured = new URL(request.url).searchParams;
      return HttpResponse.json(EMPTY_PAGE);
    }),
  );
  await reservationsApi.list(filters);
  return captured;
}

describe("reservationsApi.list", () => {
  it("sem status escolhido, manda os status da aba corrente", async () => {
    const params = await listWith({ view: "open" });

    expect(params.getAll("status")).toEqual(["RESERVED", "CHECKED_IN"]);
  });

  it("sem aba na URL, o piso é a aba `open`", async () => {
    const params = await listWith({});

    expect(params.getAll("status")).toEqual(["RESERVED", "CHECKED_IN"]);
  });

  it("na aba histórico, o piso são os status encerrados", async () => {
    const params = await listWith({ view: "history" });

    expect(params.getAll("status")).toEqual(["CHECKED_OUT", "CANCELLED"]);
  });

  it("status de outra aba na URL e descartado, não mistura as listas", async () => {
    const params = await listWith({ view: "open", status: ["CANCELLED"] });

    expect(params.getAll("status")).toEqual(["RESERVED", "CHECKED_IN"]);
  });

  it("status que pertence a aba restringe a consulta", async () => {
    const params = await listWith({ view: "open", status: ["CHECKED_IN"] });

    expect(params.getAll("status")).toEqual(["CHECKED_IN"]);
  });

  it("omite os filtros textuais vazios em vez de mandar string vazia", async () => {
    const params = await listWith({
      search: "",
      date_from: "",
      date_to: "",
      uses_parking: "",
    });

    expect(params.has("search")).toBe(false);
    expect(params.has("date_from")).toBe(false);
    expect(params.has("date_to")).toBe(false);
    expect(params.has("uses_parking")).toBe(false);
  });

  it("repassa busca, período, estacionamento e paginação", async () => {
    const params = await listWith({
      search: "silva",
      date_from: "2026-09-01",
      date_to: "2026-09-30",
      uses_parking: "1",
      page: 2,
      page_size: 50,
    });

    expect(params.get("search")).toBe("silva");
    expect(params.get("date_from")).toBe("2026-09-01");
    expect(params.get("date_to")).toBe("2026-09-30");
    expect(params.get("uses_parking")).toBe("1");
    expect(params.get("page")).toBe("2");
    expect(params.get("page_size")).toBe("50");
  });

  it("traduz `sort`/`order` da URL para o `ordering` do DRF", async () => {
    expect((await listWith({ sort: "guest", order: "asc" })).get("ordering")).toBe(
      "guest__name",
    );
    expect((await listWith({ sort: "period", order: "desc" })).get("ordering")).toBe(
      "-check_in_date",
    );
  });

  it("sem `order`, a ordenação é ascendente", async () => {
    expect((await listWith({ sort: "code" })).get("ordering")).toBe("code");
  });

  it("sem `sort`, não manda `ordering` — a ordem é a padrão do backend", async () => {
    expect((await listWith({})).has("ordering")).toBe(false);
  });
});

describe("reservationsApi", () => {
  it("`get` busca o detalhe da reserva", async () => {
    const reservation = await reservationsApi.get("r1");

    expect(reservation.id).toBe("r1");
    expect(reservation.code).toBe("R-0001");
  });

  it("`create` envia o payload no POST da coleção", async () => {
    let body: unknown;
    server.use(
      http.post(`${API_URL}/reservations/`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: "r5", code: "R-0005" }, { status: 201 });
      }),
    );

    const created = await reservationsApi.create({
      guest_id: "g1",
      check_in_date: "2026-09-10",
      check_out_date: "2026-09-12",
      room: "101",
      uses_parking: false,
    });

    expect(body).toMatchObject({ guest_id: "g1", room: "101" });
    expect(created).toMatchObject({ id: "r5" });
  });

  it("`update` usa PATCH no recurso da reserva", async () => {
    let method = "";
    server.use(
      http.patch(`${API_URL}/reservations/:id/`, ({ request }) => {
        method = request.method;
        return HttpResponse.json({ id: "r1", room: "305" });
      }),
    );

    const updated = await reservationsApi.update("r1", {
      guest_id: "g1",
      check_in_date: "2026-09-10",
      check_out_date: "2026-09-12",
      room: "305",
      uses_parking: false,
    });

    expect(method).toBe("PATCH");
    expect(updated).toMatchObject({ room: "305" });
  });

  it("`cancel` posta na ação de cancelamento da reserva", async () => {
    let url = "";
    server.use(
      http.post(`${API_URL}/reservations/:id/cancel/`, ({ request }) => {
        url = new URL(request.url).pathname;
        return HttpResponse.json({ id: "r1", status: "CANCELLED" });
      }),
    );

    const cancelled = await reservationsApi.cancel("r1");

    expect(url).toBe("/api/reservations/r1/cancel/");
    expect(cancelled).toMatchObject({ status: "CANCELLED" });
  });

  it("`quote` devolve o breakdown estimado", async () => {
    const quote = await reservationsApi.quote({
      check_in_date: "2026-09-03",
      check_out_date: "2026-09-06",
      uses_parking: true,
    });

    expect(quote.total).toBe("470.00");
    expect(quote.nights).toBe(3);
  });

  it("`availableRooms` repassa período e reserva excluída como query params", async () => {
    let params = new URLSearchParams();
    server.use(
      http.get(`${API_URL}/rooms/available/`, ({ request }) => {
        params = new URL(request.url).searchParams;
        return HttpResponse.json({ total_rooms: 15, available: ["101"], occupied: [] });
      }),
    );

    const rooms = await reservationsApi.availableRooms({
      check_in_date: "2026-09-03",
      check_out_date: "2026-09-06",
      exclude_reservation: "r1",
    });

    expect(params.get("check_in_date")).toBe("2026-09-03");
    expect(params.get("check_out_date")).toBe("2026-09-06");
    expect(params.get("exclude_reservation")).toBe("r1");
    expect(rooms.available).toEqual(["101"]);
  });
});

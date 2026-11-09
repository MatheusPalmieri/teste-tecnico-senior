import { HttpResponse, http as mswHttp } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "@/test/msw/server";

import { onSessionExpired } from "./auth-events";
import { http } from "./http";

const API_URL = "http://localhost:8000/api";

function setCsrfCookie(value: string): void {
  document.cookie = `csrftoken=${value}; path=/`;
}

describe("http client", () => {
  afterEach(() => {
    document.cookie.split(";").forEach((cookie) => {
      const name = cookie.split("=")[0]?.trim();
      if (name)
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });
  });

  it("envia withCredentials em toda requisição", () => {
    expect(http.defaults.withCredentials).toBe(true);
  });

  it("requisição de escrita inclui X-CSRFToken lido do cookie", async () => {
    setCsrfCookie("token-abc");
    let receivedHeader: string | null = null;
    server.use(
      mswHttp.post(`${API_URL}/example/`, ({ request }) => {
        receivedHeader = request.headers.get("X-CSRFToken");
        return HttpResponse.json({ ok: true });
      }),
    );

    await http.post("/example/", {});
    expect(receivedHeader).toBe("token-abc");
  });

  it("requisição GET não envia X-CSRFToken", async () => {
    setCsrfCookie("token-abc");
    let receivedHeader: string | null | undefined = undefined;
    server.use(
      mswHttp.get(`${API_URL}/example/`, ({ request }) => {
        receivedHeader = request.headers.get("X-CSRFToken");
        return HttpResponse.json({ ok: true });
      }),
    );

    await http.get("/example/");
    expect(receivedHeader).toBeNull();
  });

  describe("refresh automático em 401", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("401 dispara refresh e repete a chamada original", async () => {
      let attempts = 0;
      let refreshCalls = 0;
      server.use(
        mswHttp.get(`${API_URL}/protected/`, () => {
          attempts += 1;
          if (attempts === 1) {
            return HttpResponse.json(
              { detail: "expired", code: "token_not_valid" },
              { status: 401 },
            );
          }
          return HttpResponse.json({ ok: true });
        }),
        mswHttp.post(`${API_URL}/auth/refresh/`, () => {
          refreshCalls += 1;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const response = await http.get("/protected/");
      expect(response.data).toEqual({ ok: true });
      expect(refreshCalls).toBe(1);
    });

    it("três 401 simultâneos disparam um único refresh", async () => {
      let refreshCalls = 0;
      server.use(
        mswHttp.get(`${API_URL}/protected-a/`, ({ request }) =>
          request.headers.get("x-retried")
            ? HttpResponse.json({ ok: true })
            : HttpResponse.json({ code: "token_not_valid" }, { status: 401 }),
        ),
        mswHttp.get(`${API_URL}/protected-b/`, () =>
          HttpResponse.json({ code: "token_not_valid" }, { status: 401 }),
        ),
        mswHttp.get(`${API_URL}/protected-c/`, () =>
          HttpResponse.json({ code: "token_not_valid" }, { status: 401 }),
        ),
        mswHttp.post(`${API_URL}/auth/refresh/`, async () => {
          refreshCalls += 1;
          await new Promise((resolve) => setTimeout(resolve, 10));
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await Promise.allSettled([
        http.get("/protected-a/"),
        http.get("/protected-b/"),
        http.get("/protected-c/"),
      ]);

      expect(refreshCalls).toBe(1);
    });

    it("refresh que falha emite sessionExpired", async () => {
      const onExpired = vi.fn();
      const unsubscribe = onSessionExpired(onExpired);

      server.use(
        mswHttp.get(`${API_URL}/protected/`, () =>
          HttpResponse.json({ code: "token_not_valid" }, { status: 401 }),
        ),
        mswHttp.post(`${API_URL}/auth/refresh/`, () =>
          HttpResponse.json({ code: "token_not_valid" }, { status: 401 }),
        ),
      );

      await expect(http.get("/protected/")).rejects.toBeTruthy();
      expect(onExpired).toHaveBeenCalledTimes(1);
      unsubscribe();
    });

    it("401 no bootstrap /auth/me/ tenta o refresh e recupera a sessão", async () => {
      let meCalls = 0;
      let refreshCalls = 0;
      server.use(
        mswHttp.get(`${API_URL}/auth/me/`, () => {
          meCalls += 1;
          return meCalls === 1
            ? HttpResponse.json({ code: "not_authenticated" }, { status: 401 })
            : HttpResponse.json({ id: "1", name: "Atendente" });
        }),
        mswHttp.post(`${API_URL}/auth/refresh/`, () => {
          refreshCalls += 1;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const response = await http.get("/auth/me/");
      expect(response.data).toEqual({ id: "1", name: "Atendente" });
      expect(refreshCalls).toBe(1);
    });

    it("visitante anônimo no bootstrap não emite sessionExpired", async () => {
      const onExpired = vi.fn();
      const unsubscribe = onSessionExpired(onExpired);
      server.use(
        mswHttp.get(`${API_URL}/auth/me/`, () =>
          HttpResponse.json({ code: "not_authenticated" }, { status: 401 }),
        ),
        mswHttp.post(`${API_URL}/auth/refresh/`, () =>
          HttpResponse.json({ code: "token_not_valid" }, { status: 401 }),
        ),
      );

      await expect(http.get("/auth/me/")).rejects.toMatchObject({
        response: { status: 401, data: { code: "token_not_valid" } },
      });
      expect(onExpired).not.toHaveBeenCalled();
      unsubscribe();
    });

    it("401 no login não tenta refresh", async () => {
      let refreshCalls = 0;
      server.use(
        mswHttp.post(`${API_URL}/auth/login/`, () =>
          HttpResponse.json({ code: "invalid_credentials" }, { status: 401 }),
        ),
        mswHttp.post(`${API_URL}/auth/refresh/`, () => {
          refreshCalls += 1;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await expect(http.post("/auth/login/", {})).rejects.toBeTruthy();
      expect(refreshCalls).toBe(0);
    });
  });
});

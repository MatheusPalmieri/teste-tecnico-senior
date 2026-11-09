import { useQuery } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { http as client } from "@/shared/lib/http";
import { server } from "@/test/msw/server";

import { AppProviders, DEFAULT_GC_TIME, DEFAULT_STALE_TIME } from "./providers";

const API_URL = "http://localhost:8000/api";

function Probe({ probeKey }: { probeKey: string }) {
  const { isError, isSuccess } = useQuery({
    queryKey: [probeKey],
    queryFn: async () => {
      const { data } = await client.get("/dashboard/summary/");
      return data;
    },
  });
  return <span data-testid="state">{isError ? "erro" : isSuccess ? "ok" : "…"}</span>;
}

let probeCounter = 0;

async function renderProbe(): Promise<void> {
  probeCounter += 1;
  render(
    <AppProviders>
      <Probe probeKey={`probe-${probeCounter}`} />
    </AppProviders>,
  );
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (screen.getByTestId("state").textContent !== "…") return;
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
  }
  throw new Error("a query não terminou dentro do tempo esperado");
}

describe("AppProviders", () => {
  it("o `staleTime` padrão cobre um turno de atendimento", () => {
    expect(DEFAULT_STALE_TIME).toBe(30 * 1000);
    expect(DEFAULT_GC_TIME).toBe(5 * 60 * 1000);
  });

  it("monta a árvore de providers em volta da aplicação", async () => {
    await renderProbe();

    expect(screen.getByTestId("state")).toHaveTextContent("ok");
  });

  it("erro 4xx não é repetido — a resposta não muda tentando de novo", async () => {
    let attempts = 0;
    server.use(
      http.get(`${API_URL}/dashboard/summary/`, () => {
        attempts += 1;
        return HttpResponse.json(
          { detail: "Check-in antes das 14h.", code: "too_early" },
          { status: 409 },
        );
      }),
    );

    await renderProbe();

    expect(screen.getByTestId("state")).toHaveTextContent("erro");
    expect(attempts).toBe(1);
  });

  it("erro 5xx e repetido mais duas vezes antes de desistir", async () => {
    let attempts = 0;
    server.use(
      http.get(`${API_URL}/dashboard/summary/`, () => {
        attempts += 1;
        return HttpResponse.json(
          { detail: "Erro interno.", code: "server_error" },
          { status: 500 },
        );
      }),
    );

    await renderProbe();

    expect(screen.getByTestId("state")).toHaveTextContent("erro");
    expect(attempts).toBe(3);
  }, 20_000);

  it("falha de rede (sem status) também é repetida", async () => {
    let attempts = 0;
    server.use(
      http.get(`${API_URL}/dashboard/summary/`, () => {
        attempts += 1;
        return HttpResponse.error();
      }),
    );

    await renderProbe();

    expect(attempts).toBe(3);
  }, 20_000);
});

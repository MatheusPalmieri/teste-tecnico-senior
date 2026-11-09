import type { APIRequestContext } from "@playwright/test";

export const API_BASE_URL = process.env.E2E_API_URL ?? "http://localhost:8000/api";

export type ScenarioName =
  | "empty"
  | "canonical-stay"
  | "arrivals-today"
  | "future-arrival"
  | "departures-today"
  | "mixed-statuses"
  | "search-fixtures";

export async function seedScenario(
  request: APIRequestContext,
  scenario: ScenarioName,
): Promise<void> {
  const resetResponse = await request.post(`${API_BASE_URL}/_test/reset/`);
  if (!resetResponse.ok()) {
    throw new Error(`Falha ao resetar o banco do E2E: ${resetResponse.status()}`);
  }
  const seedResponse = await request.post(`${API_BASE_URL}/_test/seed/`, {
    data: { scenario },
  });
  if (!seedResponse.ok()) {
    throw new Error(`Falha ao semear o cenário "${scenario}": ${seedResponse.status()}`);
  }
}

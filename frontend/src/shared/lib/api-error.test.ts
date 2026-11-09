import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it, vi } from "vitest";

import { applyApiErrorToForm, parseApiError } from "./api-error";

const FALLBACK = "Ocorreu um erro inesperado. Tente novamente.";

function axiosErrorWith(data: unknown, status = 400): AxiosError {
  const headers = new AxiosHeaders();
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", { headers }, null, {
    data,
    status,
    statusText: "Bad Request",
    headers,
    config: { headers },
  });
}

describe("parseApiError", () => {
  it("devolve `detail` e `code` do corpo padronizado da API", () => {
    const error = axiosErrorWith({
      detail: "Quarto já ocupado no período.",
      code: "room_unavailable",
    });

    expect(parseApiError(error)).toEqual({
      detail: "Quarto já ocupado no período.",
      code: "room_unavailable",
    });
  });

  it("preserva `fields` quando o backend devolve erros por campo", () => {
    const error = axiosErrorWith({
      detail: "Dados inválidos.",
      code: "validation_error",
      fields: { document: ["Documento já cadastrado."] },
    });

    expect(parseApiError(error).fields).toEqual({
      document: ["Documento já cadastrado."],
    });
  });

  it("cai no fallback quando o erro não vem do axios", () => {
    expect(parseApiError(new Error("boom"))).toEqual({
      detail: FALLBACK,
      code: "unknown_error",
    });
  });

  it("cai no fallback quando o corpo não tem o formato esperado", () => {
    expect(parseApiError(axiosErrorWith("<html>502</html>", 502))).toEqual({
      detail: FALLBACK,
      code: "unknown_error",
    });
    expect(parseApiError(axiosErrorWith({ message: "nope" }))).toEqual({
      detail: FALLBACK,
      code: "unknown_error",
    });
    expect(parseApiError(axiosErrorWith(null))).toEqual({
      detail: FALLBACK,
      code: "unknown_error",
    });
  });

  it("cai no fallback quando o axios falhou sem resposta (rede fora)", () => {
    const headers = new AxiosHeaders();
    const networkError = new AxiosError("Network Error", "ERR_NETWORK", { headers });

    expect(parseApiError(networkError)).toEqual({
      detail: FALLBACK,
      code: "unknown_error",
    });
  });
});

describe("applyApiErrorToForm", () => {
  it("aplica a primeira mensagem de cada campo via `setError` e devolve o `detail`", () => {
    const setError = vi.fn();
    const detail = applyApiErrorToForm(
      axiosErrorWith({
        detail: "Dados inválidos.",
        code: "validation_error",
        fields: {
          document: ["Documento já cadastrado.", "Segunda mensagem ignorada."],
          email: ["E-mail inválido."],
        },
      }),
      setError,
    );

    expect(detail).toBe("Dados inválidos.");
    expect(setError).toHaveBeenCalledTimes(2);
    expect(setError).toHaveBeenCalledWith("document", {
      type: "server",
      message: "Documento já cadastrado.",
    });
    expect(setError).toHaveBeenCalledWith("email", {
      type: "server",
      message: "E-mail inválido.",
    });
  });

  it("sem `fields`, não toca no formulário e só devolve a mensagem geral", () => {
    const setError = vi.fn();
    const detail = applyApiErrorToForm(
      axiosErrorWith({ detail: "Reserva já cancelada.", code: "invalid_state" }),
      setError,
    );

    expect(detail).toBe("Reserva já cancelada.");
    expect(setError).not.toHaveBeenCalled();
  });

  it("com erro desconhecido, devolve o fallback sem marcar campo nenhum", () => {
    const setError = vi.fn();

    expect(applyApiErrorToForm(new Error("boom"), setError)).toBe(FALLBACK);
    expect(setError).not.toHaveBeenCalled();
  });
});

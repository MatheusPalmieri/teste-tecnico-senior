import { isAxiosError } from "axios";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

export interface ApiErrorPayload {
  detail: string;
  code: string;
  fields?: Record<string, string[]>;
}

const FALLBACK_MESSAGE = "Ocorreu um erro inesperado. Tente novamente.";

function isApiErrorPayload(data: unknown): data is ApiErrorPayload {
  return typeof data === "object" && data !== null && "detail" in data && "code" in data;
}

export function parseApiError(error: unknown): ApiErrorPayload {
  if (isAxiosError(error) && isApiErrorPayload(error.response?.data)) {
    return error.response.data;
  }
  return { detail: FALLBACK_MESSAGE, code: "unknown_error" };
}

export function applyApiErrorToForm<TFieldValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TFieldValues>,
): string {
  const payload = parseApiError(error);

  if (payload.fields) {
    for (const [field, messages] of Object.entries(payload.fields)) {
      setError(field as Path<TFieldValues>, {
        type: "server",
        message: messages[0],
      });
    }
  }

  return payload.detail;
}

import { z } from "zod";

import { normalizeDocument } from "@/shared/lib/document";
import { normalizePhone } from "@/shared/lib/phone";

function isValidCpf(digits: string): boolean {
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

  function checkDigit(base: string, weightStart: number): number {
    let sum = 0;
    for (let i = 0; i < base.length; i += 1) {
      sum += Number(base[i]) * (weightStart - i);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  }

  const firstCheck = checkDigit(digits.slice(0, 9), 10);
  const secondCheck = checkDigit(digits.slice(0, 10), 11);
  return firstCheck === Number(digits[9]) && secondCheck === Number(digits[10]);
}

const DOCUMENT_INPUT = /^[\d.\-/\s]*[\dXx]$/;
const PHONE_INPUT = /^[\d\s()+\-.]+$/;

export const guestSchema = z.object({
  name: z.string().trim().min(3, "O nome precisa ter ao menos 3 caracteres."),
  document: z
    .string()
    .trim()
    .min(1, "Documento é obrigatório.")
    .refine(
      (raw) => DOCUMENT_INPUT.test(raw),
      "Use apenas números no documento (o RG pode terminar em X).",
    )
    .transform(normalizeDocument)
    .refine(
      (document) => document.length >= 5 && document.length <= 14,
      "O documento deve ter de 5 a 14 dígitos.",
    )
    .refine(
      (document) => document.length !== 11 || /X/.test(document) || isValidCpf(document),
      "CPF inválido.",
    ),
  phone: z
    .string()
    .trim()
    .refine((raw) => PHONE_INPUT.test(raw), "Telefone inválido: informe DDD e número.")
    .transform(normalizePhone)
    .refine(
      (digits) => digits.length >= 10 && digits.length <= 13,
      "Telefone inválido: informe DDD e número.",
    ),
  email: z.string().trim().pipe(z.email("E-mail inválido.")).optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type GuestFormValues = z.infer<typeof guestSchema>;

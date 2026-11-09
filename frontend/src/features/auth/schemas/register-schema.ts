import { z } from "zod";

export const passwordRules = [
  {
    id: "length",
    label: "Ao menos 8 caracteres",
    test: (value: string) => value.length >= 8,
  },
  {
    id: "upper",
    label: "Uma letra maiúscula",
    test: (value: string) => /[A-ZÀ-Þ]/.test(value),
  },
  {
    id: "lower",
    label: "Uma letra minúscula",
    test: (value: string) => /[a-zà-þ]/.test(value),
  },
  { id: "digit", label: "Um número", test: (value: string) => /\d/.test(value) },
  {
    id: "special",
    label: "Um caractere especial (!@#$%...)",
    test: (value: string) => /[^A-Za-zÀ-ÿ0-9]/.test(value),
  },
] as const;

const passwordSchema = z
  .string()
  .min(1, "Informe a senha.")
  .refine(
    (value) => passwordRules.every((rule) => rule.test(value)),
    "A senha ainda não atende aos requisitos abaixo.",
  );

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Informe o nome.").max(120, "Nome muito longo."),
    email: z
      .string()
      .trim()
      .min(1, "Informe o e-mail.")
      .pipe(z.email("E-mail inválido.")),
    password: passwordSchema,
    confirm_password: z.string().min(1, "Confirme a senha."),
  })
  .refine((data) => data.password === data.confirm_password, {
    error: "As senhas não conferem.",
    path: ["confirm_password"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

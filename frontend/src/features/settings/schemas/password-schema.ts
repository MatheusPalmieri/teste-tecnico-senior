import { z } from "zod";

import { passwordRules } from "@/features/auth";

export const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Informe a senha atual."),
    new_password: z
      .string()
      .refine(
        (value) => passwordRules.every((rule) => rule.test(value)),
        "A senha precisa ter 8 caracteres, maiúscula, minúscula, número e caractere especial.",
      ),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    error: "As senhas não coincidem.",
    path: ["confirm_password"],
  });

export type PasswordFormValues = z.infer<typeof passwordSchema>;

import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().trim().min(3, "O nome precisa ter ao menos 3 caracteres."),
  email: z.string().trim().pipe(z.email("E-mail inválido.")),
  current_password: z.string().optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

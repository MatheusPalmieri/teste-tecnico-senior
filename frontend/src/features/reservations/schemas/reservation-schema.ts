import { z } from "zod";

export const reservationSchema = z
  .object({
    guest_id: z.string().min(1, "Selecione um hóspede."),
    room: z.string().min(1, "Selecione um quarto."),
    check_in_date: z.string().min(1, "Informe a data de entrada."),
    check_out_date: z.string().min(1, "Informe a data de saída."),
    uses_parking: z.boolean(),
    notes: z.string().optional().or(z.literal("")),
  })
  .refine((data) => data.check_out_date > data.check_in_date, {
    error: "A data de saída deve ser posterior à data de entrada.",
    path: ["check_out_date"],
  });

export type ReservationFormValues = z.infer<typeof reservationSchema>;

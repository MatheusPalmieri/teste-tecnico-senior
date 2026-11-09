import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useEntityForm } from "@/shared/hooks/use-entity-form";
import { addDaysToIsoDate, todayIsoDate } from "@/shared/lib/date";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { DatePicker } from "@/shared/ui/date-picker";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { Textarea } from "@/shared/ui/textarea";

import { ChargesBreakdown } from "./charges-breakdown";
import { ChargesBreakdownSkeleton } from "./charges-breakdown-skeleton";
import { GuestCombobox } from "./guest-combobox";
import { RoomSelect } from "./room-select";
import {
  useCreateReservation,
  useUpdateReservation,
} from "../hooks/use-reservation-mutations";
import { useQuote } from "../hooks/use-quote";
import { reservationWarningMessages } from "../lib/reservation-warnings";
import { reservationSchema } from "../schemas/reservation-schema";

import type { Reservation } from "../api/types";

interface ReservationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation?: Reservation | null;
  onSuccess?: () => void;
}

export function ReservationFormDialog({
  open,
  onOpenChange,
  reservation,
  onSuccess,
}: ReservationFormDialogProps) {
  const { form, isEditing, isPending, submit } = useEntityForm({
    open,
    entity: reservation,
    schema: reservationSchema,
    toValues: (entity) => ({
      guest_id: entity?.guest.id ?? "",
      room: entity?.room ?? "",
      check_in_date: entity?.check_in_date ?? "",
      check_out_date: entity?.check_out_date ?? "",
      uses_parking: entity?.uses_parking ?? false,
      notes: entity?.notes ?? "",
    }),
    create: useCreateReservation(),
    update: useUpdateReservation(reservation?.id ?? ""),
    onClose: () => onOpenChange(false),
    onSaved: (result) => {
      for (const message of reservationWarningMessages(result)) toast.warning(message);
      onSuccess?.();
    },
    messages: { created: "Reserva criada.", updated: "Reserva atualizada." },
  });

  const [guestLabel, setGuestLabel] = useState(reservation?.guest.name ?? "");

  useEffect(() => {
    if (open) {
      setGuestLabel(reservation?.guest.name ?? "");
    }
  }, [open, reservation]);

  const checkInDate = form.watch("check_in_date");
  const checkOutDate = form.watch("check_out_date");
  const usesParking = form.watch("uses_parking");
  const guestId = form.watch("guest_id");

  const today = todayIsoDate;
  const minCheckInDate =
    reservation?.check_in_date && reservation.check_in_date < today()
      ? reservation.check_in_date
      : today();
  const minCheckOutDate = addDaysToIsoDate(checkInDate || minCheckInDate, 1);
  const maxCheckInDate = checkOutDate ? addDaysToIsoDate(checkOutDate, -1) : undefined;

  const quote = useQuote({ checkInDate, checkOutDate, usesParking });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar reserva" : "Nova reserva"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize os dados da reserva."
              : "Preencha os dados para criar a reserva."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <DialogBody>
              <FormField
                control={form.control}
                name="guest_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hóspede</FormLabel>
                    <FormControl>
                      <GuestCombobox
                        value={field.value}
                        guestLabel={guestLabel}
                        onSelect={(id, label) => {
                          field.onChange(id);
                          setGuestLabel(label);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="check_in_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entrada</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value}
                          minDate={minCheckInDate}
                          maxDate={maxCheckInDate}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="check_out_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Saída</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value}
                          minDate={minCheckOutDate}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="room"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quarto</FormLabel>
                    <FormControl>
                      <RoomSelect
                        value={field.value}
                        onChange={field.onChange}
                        checkInDate={checkInDate}
                        checkOutDate={checkOutDate}
                        excludeReservationId={reservation?.id}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="uses_parking"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="mt-0!">Usa vaga de carro</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observacoes (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={3}
                        placeholder="Chegada tarde, berco, andar preferido..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {quote.data ? (
                <ChargesBreakdown breakdown={quote.data} />
              ) : (
                quote.isFetching && <ChargesBreakdownSkeleton />
              )}
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending || !guestId}>
                Salvar reserva
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

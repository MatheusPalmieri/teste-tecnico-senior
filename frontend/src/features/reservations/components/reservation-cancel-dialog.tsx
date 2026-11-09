import { toast } from "sonner";

import { parseApiError } from "@/shared/lib/api-error";
import { Callout } from "@/shared/ui/callout";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";

import { useCancelReservation } from "../hooks/use-reservation-mutations";

import type { Reservation } from "../api/types";

interface ReservationCancelDialogProps {
  reservation: Reservation | null;
  onOpenChange: (open: boolean) => void;
}

export function ReservationCancelDialog({
  reservation,
  onOpenChange,
}: ReservationCancelDialogProps) {
  const cancelReservation = useCancelReservation();

  function handleConfirm(): void {
    if (!reservation) return;
    cancelReservation.mutate(reservation.id, {
      onSuccess: () => {
        toast.success("Reserva cancelada.");
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(parseApiError(error).detail);
      },
    });
  }

  return (
    <ConfirmDialog
      open={reservation !== null}
      onOpenChange={onOpenChange}
      title="Cancelar reserva"
      description={`Tem certeza que deseja cancelar a reserva ${reservation?.code ?? ""}?`}
      confirmLabel="Cancelar reserva"
      onConfirm={handleConfirm}
      isLoading={cancelReservation.isPending}
    >
      <Callout tone="info">
        A reserva fica marcada como <span className="font-medium">Cancelada</span> e
        continua no histórico do hóspede. Reservas nunca são apagadas.
      </Callout>
    </ConfirmDialog>
  );
}

import { useState } from "react";
import { toast } from "sonner";

import {
  ChargesBreakdown,
  ChargesBreakdownSkeleton,
  useReservation,
  type Reservation,
} from "@/features/reservations";
import { formatDate } from "@/shared/lib/date";
import { parseApiError } from "@/shared/lib/api-error";
import { Button } from "@/shared/ui/button";
import { Callout } from "@/shared/ui/callout";
import { ConfirmButton } from "@/shared/ui/confirm-button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { ErrorState } from "@/shared/ui/error-state";
import { SkeletonText } from "@/shared/ui/skeleton";

import { LateCheckOutAlert } from "./late-check-out-alert";
import { useCheckOut } from "../hooks/use-check-out";
import { useCheckOutPreview } from "../hooks/use-check-out-preview";

interface CheckOutDialogProps {
  reservationId: string | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (reservation: Reservation) => void;
}

export function CheckOutDialog({
  reservationId,
  onOpenChange,
  onSuccess,
}: CheckOutDialogProps) {
  const { data: reservation } = useReservation(reservationId);
  const preview = useCheckOutPreview(reservationId);
  const checkOut = useCheckOut(reservationId ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleConfirm(): void {
    if (!reservationId || !preview.data) return;
    setErrorMessage(null);
    checkOut.mutate(
      { expectedTotal: preview.data.total },
      {
        onSuccess: (updated) => {
          toast.success("Check-out realizado.");
          onOpenChange(false);
          onSuccess?.(updated);
        },
        onError: (error) => {
          const { code, detail } = parseApiError(error);
          setErrorMessage(detail);
          if (code === "check_out_total_changed") void preview.refetch();
        },
      },
    );
  }

  const confirmDisabled = preview.isLoading || preview.isError || checkOut.isPending;

  return (
    <Dialog
      key={reservationId ?? "closed"}
      open={reservationId !== null}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Confirmar check-out</DialogTitle>
          <DialogDescription>
            {reservation ? (
              `${reservation.guest.name} · Quarto ${reservation.room}`
            ) : (
              <SkeletonText variant="small" width={208} />
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <p className="text-small text-neutral-500">
            {reservation ? (
              `${formatDate(reservation.check_in_date)} - ${formatDate(reservation.check_out_date)}`
            ) : (
              <SkeletonText variant="small" width={176} />
            )}
          </p>

          {preview.isLoading && <ChargesBreakdownSkeleton />}

          {preview.isError && <ErrorState onRetry={() => preview.refetch()} />}

          {errorMessage && (
            <p className="text-small text-destructive" role="alert">
              {errorMessage}
            </p>
          )}

          {reservation && (
            <Callout tone="info">
              O período reservado (até {formatDate(reservation.check_out_date)}) é o
              mínimo cobrado — sair antes não reduz o total.
            </Callout>
          )}

          {preview.data && (
            <div className="flex flex-col gap-4">
              <LateCheckOutAlert preview={preview.data} />
              <ChargesBreakdown breakdown={preview.data} />
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <ConfirmButton
            label="Fazer check-out"
            confirmLabel="Confirmar check-out"
            onConfirm={handleConfirm}
            disabled={confirmDisabled}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

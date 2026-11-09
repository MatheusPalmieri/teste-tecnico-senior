import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useReservation } from "@/features/reservations";
import { formatDate, formatTime, todayIsoDate } from "@/shared/lib/date";
import { formatPhone } from "@/shared/lib/phone";
import { parseApiError } from "@/shared/lib/api-error";
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
import { DetailGrid, DetailGridSkeleton, DetailItem } from "@/shared/ui/detail-grid";
import { ErrorState } from "@/shared/ui/error-state";
import { Label } from "@/shared/ui/label";
import { SkeletonText } from "@/shared/ui/skeleton";

import { EarlyCheckInAlert } from "./early-check-in-alert";
import { useCheckIn } from "../hooks/use-check-in";
import { isCheckInAllowed } from "../lib/check-in-window";

interface CheckInDialogProps {
  reservationId: string | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CheckInDialog({
  reservationId,
  onOpenChange,
  onSuccess,
}: CheckInDialogProps) {
  const {
    data: reservation,
    isLoading,
    isError,
    refetch,
  } = useReservation(reservationId);
  const checkIn = useCheckIn(reservationId ?? "");

  const [authorizeEarly, setAuthorizeEarly] = useState(false);
  const [usesParking, setUsesParking] = useState(false);
  const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (reservation) {
      setUsesParking(reservation.uses_parking);
    }
    if (reservationId === null) {
      setAuthorizeEarly(false);
      setServerErrorMessage(null);
    }
  }, [reservation, reservationId]);

  const now = new Date();
  const allowed = isCheckInAllowed(now);
  const currentTime = formatTime(now.toISOString());
  const today = todayIsoDate();
  const beforeReservedDate = reservation ? today < reservation.check_in_date : false;
  const periodOver = reservation ? today >= reservation.check_out_date : false;
  const outsidePeriod = beforeReservedDate || periodOver;

  function handleConfirm(): void {
    if (!reservationId) return;
    setServerErrorMessage(null);
    checkIn.mutate(
      { authorize_early: authorizeEarly, uses_parking: usesParking },
      {
        onSuccess: () => {
          toast.success("Check-in realizado.");
          onOpenChange(false);
          onSuccess?.();
        },
        onError: (error) => {
          setServerErrorMessage(parseApiError(error).detail);
        },
      },
    );
  }

  const canConfirm = !outsidePeriod && (allowed || authorizeEarly) && !checkIn.isPending;

  return (
    <Dialog
      open={reservationId !== null}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar check-in</DialogTitle>
          <DialogDescription>Registre a entrada efetiva do hóspede.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {isLoading && <ReservationSummarySkeleton />}

          {isError && <ErrorState onRetry={() => refetch()} />}

          {reservation && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <p className="text-caption uppercase text-neutral-500">
                  Resumo da reserva
                </p>
                <DetailGrid bordered>
                  <DetailItem label="Hóspede">{reservation.guest.name}</DetailItem>
                  <DetailItem label="Documento">{reservation.guest.document}</DetailItem>
                  <DetailItem label="Telefone">
                    {formatPhone(reservation.guest.phone)}
                  </DetailItem>
                  <DetailItem label="Quarto">{reservation.room}</DetailItem>
                  <DetailItem label="Período" wide>
                    {formatDate(reservation.check_in_date)} -{" "}
                    {formatDate(reservation.check_out_date)}
                  </DetailItem>
                </DetailGrid>
              </div>

              {beforeReservedDate && (
                <p role="alert" className="text-small text-destructive">
                  O check-in só pode ser feito a partir de{" "}
                  {formatDate(reservation.check_in_date)}, data de entrada da reserva.
                </p>
              )}

              {periodOver && (
                <p role="alert" className="text-small text-destructive">
                  O período desta reserva terminou em{" "}
                  {formatDate(reservation.check_out_date)}; o check-in não é mais
                  possível.
                </p>
              )}

              {!outsidePeriod && !allowed && (
                <EarlyCheckInAlert
                  currentTime={currentTime}
                  serverMessage={serverErrorMessage ?? undefined}
                />
              )}

              {allowed && serverErrorMessage && (
                <p role="alert" className="text-small text-destructive">
                  {serverErrorMessage}
                </p>
              )}

              <div className="flex flex-col gap-2">
                <p className="text-caption uppercase text-neutral-500">Vaga de carro</p>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="check-in-uses-parking"
                    checked={usesParking}
                    onCheckedChange={(checked) => setUsesParking(checked === true)}
                  />
                  <Label htmlFor="check-in-uses-parking">Usa vaga de carro</Label>
                </div>
              </div>
            </div>
          )}
        </DialogBody>
        <DialogFooter className={!allowed ? "sm:justify-between" : undefined}>
          {!allowed && !outsidePeriod && (
            <label
              htmlFor="authorize-early-check-in"
              title="Fica registrado que a chegada foi liberada antes das 14h00 por decisão do atendente."
              className="flex items-center gap-2 text-small font-medium text-warning-text"
            >
              <Checkbox
                id="authorize-early-check-in"
                checked={authorizeEarly}
                onCheckedChange={(checked) => setAuthorizeEarly(checked === true)}
                className="border-warning-text data-[state=checked]:bg-warning-text data-[state=checked]:border-warning-text"
              />
              Autorizar check-in antecipado
            </label>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={!canConfirm}>
              Confirmar check-in
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReservationSummarySkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      <SkeletonText variant="caption" width={128} />
      <DetailGridSkeleton
        bordered
        fields={[
          { width: 168 },
          { width: 128 },
          { width: 144 },
          { width: 56 },
          { width: 192, wide: true },
        ]}
      />
    </div>
  );
}

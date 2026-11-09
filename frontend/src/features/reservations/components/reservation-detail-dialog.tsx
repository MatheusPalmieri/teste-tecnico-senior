import { formatDate, formatDateTime } from "@/shared/lib/date";
import { cn } from "@/shared/lib/cn";
import { DetailGrid, DetailGridSkeleton, DetailItem } from "@/shared/ui/detail-grid";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { ErrorState } from "@/shared/ui/error-state";
import { Skeleton, SkeletonText } from "@/shared/ui/skeleton";
import { StatusBadge } from "@/shared/ui/status-badge";

import { ChargesBreakdown } from "./charges-breakdown";
import { useReservation } from "../hooks/use-reservation";

import type { Reservation } from "../api/types";

interface ReservationDetailDialogProps {
  reservationId: string | null;
  onOpenChange: (open: boolean) => void;
}

interface TimelineStep {
  title: string;
  at: string | null;
  pending: boolean;
}

function buildTimeline(reservation: Reservation): TimelineStep[] {
  const steps: TimelineStep[] = [
    { title: "Reserva criada", at: reservation.created_at, pending: false },
  ];

  if (reservation.status === "CANCELLED") {
    steps.push({ title: "Cancelada", at: null, pending: false });
    return steps;
  }

  steps.push({
    title: "Check-in",
    at: reservation.checked_in_at,
    pending: !reservation.checked_in_at,
  });
  steps.push({
    title: "Check-out",
    at: reservation.checked_out_at,
    pending: !reservation.checked_out_at,
  });
  return steps;
}

function ReservationTimeline({ reservation }: { reservation: Reservation }) {
  const steps = buildTimeline(reservation);

  return (
    <div className="flex flex-col">
      {steps.map((step, index) => (
        <div key={step.title} className="flex gap-3">
          <div className="flex w-4 flex-col items-center">
            <span
              className={cn(
                "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                step.pending ? "border-2 border-neutral-300 bg-white" : "bg-primary-500",
              )}
            />
            {index < steps.length - 1 && <span className="w-0.5 flex-1 bg-neutral-200" />}
          </div>
          <div className="pb-3.5">
            <p
              className={cn(
                "text-body-strong",
                step.pending ? "text-neutral-500" : "text-neutral-900",
              )}
            >
              {step.title}
            </p>
            {step.at && (
              <p className="text-small tabular-nums text-neutral-500">
                {formatDateTime(step.at)}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReservationDetailDialog({
  reservationId,
  onOpenChange,
}: ReservationDetailDialogProps) {
  const {
    data: reservation,
    isLoading,
    isError,
    refetch,
  } = useReservation(reservationId);

  return (
    <Dialog
      open={reservationId !== null}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{reservation?.code ?? "Detalhe da reserva"}</DialogTitle>
          <DialogDescription>Dados completos da reserva.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {isLoading && <ReservationDetailSkeleton />}

          {isError && <ErrorState onRetry={() => refetch()} />}

          {reservation && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-body-strong">{reservation.guest.name}</span>
                  <span className="text-small text-neutral-500">
                    {reservation.guest.document}
                  </span>
                </div>
                <StatusBadge status={reservation.status} />
              </div>

              <DetailGrid>
                <DetailItem label="Período">
                  {formatDate(reservation.check_in_date)} -{" "}
                  {formatDate(reservation.check_out_date)}
                </DetailItem>
                <DetailItem label="Quarto">{reservation.room}</DetailItem>
                {reservation.checked_in_at && (
                  <DetailItem label="Check-in">
                    {formatDateTime(reservation.checked_in_at)}
                  </DetailItem>
                )}
                {reservation.checked_out_at && (
                  <DetailItem label="Check-out">
                    {formatDateTime(reservation.checked_out_at)}
                  </DetailItem>
                )}
              </DetailGrid>

              <div className="flex flex-col gap-2">
                <h3 className="text-h3 text-neutral-900">Linha do tempo</h3>
                <ReservationTimeline reservation={reservation} />
              </div>

              {reservation.charges_snapshot ? (
                <ChargesBreakdown breakdown={reservation.charges_snapshot} />
              ) : reservation.estimated_total ? (
                <p className="text-small text-neutral-500">
                  Estimativa:{" "}
                  <span className="text-body-strong">
                    R$ {reservation.estimated_total}
                  </span>
                </p>
              ) : null}
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function ReservationDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <SkeletonText variant="body-strong" width={176} />
          <SkeletonText variant="small" width={128} />
        </div>
        <Skeleton className="h-[22px] w-20 shrink-0 rounded-sm" />
      </div>

      <DetailGridSkeleton fields={[{ width: 176 }, { width: 64 }]} />

      <div className="flex flex-col gap-2">
        <SkeletonText variant="h3" width={128} />
        <div className="flex flex-col">
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex gap-3">
              <div className="flex w-4 flex-col items-center">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-neutral-200" />
                {index < 2 && <span className="w-0.5 flex-1 bg-neutral-200" />}
              </div>
              <div className="flex-1 pb-3.5">
                <SkeletonText variant="body-strong" width={112} />
                <SkeletonText variant="small" width={144} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

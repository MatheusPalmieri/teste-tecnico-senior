import { formatDate } from "@/shared/lib/date";
import { formatPhone } from "@/shared/lib/phone";
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
import { QueryList } from "@/shared/ui/query-list";
import { Skeleton, SkeletonText } from "@/shared/ui/skeleton";
import { StatusBadge } from "@/shared/ui/status-badge";
import { CalendarX } from "lucide-react";

import { useGuest } from "../hooks/use-guest";

interface GuestDetailDialogProps {
  guestId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function GuestDetailDialog({ guestId, onOpenChange }: GuestDetailDialogProps) {
  const { data: guest, isLoading, isError, refetch } = useGuest(guestId);

  return (
    <Dialog open={guestId !== null} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{guest?.name ?? "Detalhe do hóspede"}</DialogTitle>
          <DialogDescription>Dados cadastrais e histórico de reservas.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {isLoading && <GuestDetailSkeleton />}

          {isError && <ErrorState onRetry={() => refetch()} />}

          {guest && (
            <div className="flex flex-col gap-6">
              <DetailGrid>
                <DetailItem label="Documento">
                  {guest.document_type} {guest.document}
                </DetailItem>
                <DetailItem label="Telefone">{formatPhone(guest.phone)}</DetailItem>
                {guest.email && <DetailItem label="E-mail">{guest.email}</DetailItem>}
              </DetailGrid>

              <div className="flex flex-col gap-2">
                <h3 className="text-h3 text-neutral-900">Histórico de reservas</h3>
                <QueryList
                  items={guest.reservations}
                  isLoading={false}
                  isError={false}
                  onRetry={() => refetch()}
                  getItemKey={(reservation) => reservation.id}
                  emptyIcon={CalendarX}
                  emptyTitle="Nenhuma reserva ainda"
                  emptyDescription="Este hóspede ainda não tem reservas registradas."
                  renderItem={(reservation) => (
                    <>
                      <div className="flex flex-col">
                        <span className="text-body-strong">{reservation.code}</span>
                        <span className="text-small text-neutral-500">
                          {formatDate(reservation.check_in_date)} -{" "}
                          {formatDate(reservation.check_out_date)} · Quarto{" "}
                          {reservation.room}
                        </span>
                      </div>
                      <StatusBadge status={reservation.status} />
                    </>
                  )}
                />
              </div>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function GuestDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <DetailGridSkeleton fields={[{ width: 144 }, { width: 128 }, { width: 168 }]} />

      <div className="flex flex-col gap-2">
        <SkeletonText variant="h3" width={176} />
        <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200">
          {[0, 1].map((index) => (
            <div key={index} className="flex items-center justify-between gap-3 p-3">
              <div className="flex min-w-0 flex-1 flex-col">
                <SkeletonText variant="body-strong" width={96} />
                <SkeletonText variant="small" width={index === 0 ? 232 : 208} />
              </div>
              <Skeleton className="h-[22px] w-20 shrink-0 rounded-sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

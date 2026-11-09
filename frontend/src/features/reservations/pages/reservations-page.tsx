import { CalendarPlus2 } from "lucide-react";
import { useState } from "react";

import { CheckInDialog } from "@/features/check-in";
import { CheckOutDialog } from "@/features/check-out";
import { useListView } from "@/shared/hooks/use-list-view";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";

import { ReservationCancelDialog } from "../components/reservation-cancel-dialog";
import { ReservationDetailDialog } from "../components/reservation-detail-dialog";
import { ReservationFormDialog } from "../components/reservation-form-dialog";
import { ReservationsFilterBar } from "../components/reservations-filter-bar";
import { ReservationsTable } from "../components/reservations-table";
import { useReservations } from "../hooks/use-reservations";
import { reservationFiltersSchema } from "../schemas/reservation-filters";

import type { Reservation } from "../api/types";

export function ReservationsPage() {
  const {
    filters,
    setFilter,
    setFilters,
    activeFilterCount,
    sorting,
    onSortingChange,
    buildPagination,
  } = useListView(reservationFiltersSchema);
  const { data, isLoading, isError, refetch } = useReservations(filters);

  const [formReservation, setFormReservation] = useState<Reservation | null | undefined>(
    undefined,
  );
  const [detailId, setDetailId] = useState<string | null>(null);
  const [cancellingReservation, setCancellingReservation] = useState<Reservation | null>(
    null,
  );
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);

  function clearFilters(): void {
    setFilters({ search: "", status: [], date_from: "", date_to: "", uses_parking: "" });
  }

  const isFiltered =
    filters.search !== "" ||
    filters.status.length > 0 ||
    filters.date_from !== "" ||
    filters.date_to !== "" ||
    filters.uses_parking !== "";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reservas"
        description={
          data
            ? `${data.count} reservas encontradas`
            : "Criacao e acompanhamento de reservas."
        }
        actions={
          <Button onClick={() => setFormReservation(null)}>
            <CalendarPlus2 className="h-4 w-4" />
            Nova reserva
          </Button>
        }
      />

      <ReservationsFilterBar
        filters={filters}
        setFilter={setFilter}
        setFilters={setFilters}
        onViewChange={(view) => setFilters({ view, status: [] })}
        clearAll={clearFilters}
        activeFilterCount={activeFilterCount}
        currentViewCount={data?.count}
      />

      <ReservationsTable
        reservations={data?.results ?? []}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        isFiltered={isFiltered}
        sorting={sorting}
        onSortingChange={onSortingChange}
        pagination={buildPagination(data?.count)}
        onView={(reservation) => setDetailId(reservation.id)}
        onEdit={(reservation) => setFormReservation(reservation)}
        onCancel={(reservation) => setCancellingReservation(reservation)}
        onCreate={() => setFormReservation(null)}
        onCheckIn={(reservation) => setCheckingInId(reservation.id)}
        onCheckOut={(reservation) => setCheckingOutId(reservation.id)}
      />

      <ReservationFormDialog
        open={formReservation !== undefined}
        onOpenChange={(open) => !open && setFormReservation(undefined)}
        reservation={formReservation}
      />

      <ReservationDetailDialog
        reservationId={detailId}
        onOpenChange={() => setDetailId(null)}
      />

      <ReservationCancelDialog
        reservation={cancellingReservation}
        onOpenChange={(open) => !open && setCancellingReservation(null)}
      />

      <CheckInDialog
        reservationId={checkingInId}
        onOpenChange={() => setCheckingInId(null)}
      />

      <CheckOutDialog
        reservationId={checkingOutId}
        onOpenChange={() => setCheckingOutId(null)}
      />
    </div>
  );
}

export default ReservationsPage;

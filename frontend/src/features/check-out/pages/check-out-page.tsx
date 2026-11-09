import { useState } from "react";

import type { Reservation } from "@/features/reservations";
import { useUrlFilters } from "@/shared/hooks/use-url-filters";
import { PageHeader } from "@/shared/ui/page-header";

import { CheckOutDialog } from "../components/check-out-dialog";
import { CheckOutReceiptDialog } from "../components/check-out-receipt-dialog";
import { DeparturesFilterBar } from "../components/departures-filter-bar";
import { DeparturesList } from "../components/departures-list";
import { useDepartures } from "../hooks/use-departures";
import { departuresFiltersSchema } from "../schemas/departures-filters";

export function CheckOutPage() {
  const { filters, setFilter } = useUrlFilters(departuresFiltersSchema);
  const { data, isLoading, isError, refetch } = useDepartures(filters);
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Reservation | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Check-out"
        description="Fila de saídas e total geral detalhado."
      />

      <DeparturesFilterBar filters={filters} onChange={setFilter} />

      <DeparturesList
        departures={data?.results ?? []}
        scope={filters.scope}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        onCheckOut={(departure) => setCheckingOutId(departure.id)}
      />

      <CheckOutDialog
        reservationId={checkingOutId}
        onOpenChange={() => setCheckingOutId(null)}
        onSuccess={(reservation) => setReceipt(reservation)}
      />

      <CheckOutReceiptDialog
        reservation={receipt}
        onOpenChange={() => setReceipt(null)}
      />
    </div>
  );
}

export default CheckOutPage;

import { useState } from "react";

import { useUrlFilters } from "@/shared/hooks/use-url-filters";
import { PageHeader } from "@/shared/ui/page-header";

import { ArrivalsFilterBar } from "../components/arrivals-filter-bar";
import { ArrivalsList } from "../components/arrivals-list";
import { CheckInDialog } from "../components/check-in-dialog";
import { useArrivals } from "../hooks/use-arrivals";
import { arrivalsFiltersSchema } from "../schemas/arrivals-filters";

export function CheckInPage() {
  const { filters, setFilter } = useUrlFilters(arrivalsFiltersSchema);
  const { data, isLoading, isError, refetch } = useArrivals(filters);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Check-in" description="Fila de chegadas do dia." />

      <ArrivalsFilterBar filters={filters} onChange={setFilter} />

      <ArrivalsList
        arrivals={data?.results ?? []}
        scope={filters.scope}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        onCheckIn={(arrival) => setCheckingInId(arrival.id)}
      />

      <CheckInDialog
        reservationId={checkingInId}
        onOpenChange={() => setCheckingInId(null)}
      />
    </div>
  );
}

export default CheckInPage;

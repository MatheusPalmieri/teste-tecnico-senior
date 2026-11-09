import { useState } from "react";

import { CheckOutDialog, DeparturesList, useDepartures } from "@/features/check-out";

import { DashboardCard } from "./dashboard-card";

export function DeparturesCard() {
  const { data, isLoading, isError, refetch } = useDepartures({
    search: "",
    scope: "today",
  });
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);

  return (
    <DashboardCard title="Saídas de hoje">
      <DeparturesList
        departures={data?.results ?? []}
        scope="today"
        variant="rows"
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        onCheckOut={(departure) => setCheckingOutId(departure.id)}
      />

      <CheckOutDialog
        reservationId={checkingOutId}
        onOpenChange={() => setCheckingOutId(null)}
        onSuccess={() => refetch()}
      />
    </DashboardCard>
  );
}

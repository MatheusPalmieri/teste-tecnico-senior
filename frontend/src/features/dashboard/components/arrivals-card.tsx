import { useState } from "react";

import { ArrivalsList, CheckInDialog, useArrivals } from "@/features/check-in";

import { DashboardCard } from "./dashboard-card";

export function ArrivalsCard() {
  const { data, isLoading, isError, refetch } = useArrivals({
    search: "",
    scope: "today",
  });
  const [checkingInId, setCheckingInId] = useState<string | null>(null);

  return (
    <DashboardCard title="Chegadas de hoje">
      <ArrivalsList
        arrivals={data?.results ?? []}
        scope="today"
        variant="rows"
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        onCheckIn={(arrival) => setCheckingInId(arrival.id)}
      />

      <CheckInDialog
        reservationId={checkingInId}
        onOpenChange={() => setCheckingInId(null)}
        onSuccess={() => refetch()}
      />
    </DashboardCard>
  );
}

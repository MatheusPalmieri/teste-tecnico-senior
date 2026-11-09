import { CalendarPlus2 } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/features/auth";
import { ReservationFormDialog } from "@/features/reservations";
import { formatLongDate, greetingForNow, todayIsoDate } from "@/shared/lib/date";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";

import { ArrivalsCard } from "../components/arrivals-card";
import { DeparturesCard } from "../components/departures-card";
import { InHouseCard } from "../components/in-house-card";
import { KpiGrid } from "../components/kpi-grid";

function firstName(name: string | undefined): string {
  return name?.trim().split(/\s+/)[0] ?? "";
}

export function DashboardPage() {
  const [showNewReservation, setShowNewReservation] = useState(false);
  const { user } = useAuth();
  const today = todayIsoDate();
  const name = firstName(user?.name);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={name ? `${greetingForNow()}, ${name}` : greetingForNow()}
        description={formatLongDate(today)}
        actions={
          <Button onClick={() => setShowNewReservation(true)}>
            <CalendarPlus2 className="h-4 w-4" />
            Nova reserva
          </Button>
        }
      />

      <KpiGrid />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ArrivalsCard />
        <DeparturesCard />
      </div>

      <InHouseCard />

      <ReservationFormDialog
        open={showNewReservation}
        onOpenChange={setShowNewReservation}
      />
    </div>
  );
}

export default DashboardPage;

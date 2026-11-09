import {
  BedDouble,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  LogIn,
  PieChart,
  Wallet,
} from "lucide-react";

import { formatMoney } from "@/shared/lib/money";
import { ErrorState } from "@/shared/ui/error-state";

import { KpiCard } from "./kpi-card";
import { useDashboardSummary } from "../hooks/use-dashboard-summary";

export function KpiGrid() {
  const { data, isLoading, isError, refetch } = useDashboardSummary();

  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <KpiCard
        icon={BedDouble}
        label="Hóspedes no hotel"
        value={data ? String(data.in_house_count) : "-"}
        to="/hospedes?status=in_house"
        isLoading={isLoading}
      />
      <KpiCard
        icon={LogIn}
        label="Chegadas de hoje"
        value={data ? String(data.arrivals_today_count) : "-"}
        to="/check-in?scope=today"
        isLoading={isLoading}
      />
      <KpiCard
        icon={CalendarX}
        label="Check-outs de hoje"
        value={data ? String(data.departures_today_count) : "-"}
        to="/check-out?scope=today"
        isLoading={isLoading}
      />
      <KpiCard
        icon={CalendarClock}
        label="Aguardando check-in"
        value={data ? String(data.awaiting_check_in_count) : "-"}
        to="/hospedes?status=awaiting_check_in"
        isLoading={isLoading}
      />
      <KpiCard
        icon={CalendarCheck}
        label="Late check-out"
        value={data ? String(data.late_check_out_count) : "-"}
        to="/check-out?scope=late"
        isLoading={isLoading}
      />
      <KpiCard
        icon={PieChart}
        label="Ocupacao"
        value={data ? `${Math.round(Number(data.occupancy_rate) * 100)}%` : "-"}
        isLoading={isLoading}
      />
      <KpiCard
        icon={Wallet}
        label="Faturamento do mês"
        value={data ? formatMoney(data.revenue_month) : "-"}
        isLoading={isLoading}
        className="col-span-2"
      />
    </div>
  );
}

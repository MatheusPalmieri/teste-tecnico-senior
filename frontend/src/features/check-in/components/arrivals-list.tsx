import { CalendarCheck, LogIn } from "lucide-react";

import { QueueList } from "@/shared/ui/queue-list";
import { StatusBadge } from "@/shared/ui/status-badge";

import { OverdueBadge } from "./overdue-badge";

import type { Arrival, ArrivalsScope } from "../api/types";

interface ArrivalsListProps {
  arrivals: Arrival[];
  scope: ArrivalsScope;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onCheckIn: (arrival: Arrival) => void;
  variant?: "cards" | "rows";
}

const EMPTY_DESCRIPTION: Record<ArrivalsScope, string> = {
  today: "Nenhuma chegada prevista para hoje.",
  overdue: "Nenhuma reserva passou da data de entrada sem check-in.",
  all_pending: "Não há reservas aguardando check-in.",
  history: "Nenhuma chegada já resolvida — nada entrou, saiu ou foi cancelado ainda.",
};

export function ArrivalsList({
  arrivals,
  scope,
  isLoading,
  isError,
  onRetry,
  onCheckIn,
  variant = "cards",
}: ArrivalsListProps) {
  const isHistory = scope === "history";

  return (
    <QueueList
      items={arrivals}
      toEntry={(arrival) => ({
        id: arrival.id,
        room: arrival.room,
        guestName: arrival.guest.name,
        code: arrival.code,
        checkInDate: arrival.check_in_date,
        checkOutDate: arrival.check_out_date,
        usesParking: arrival.uses_parking,
        highlighted: arrival.is_overdue,
        badge: isHistory ? (
          <StatusBadge status={arrival.status} />
        ) : arrival.is_overdue ? (
          <OverdueBadge />
        ) : undefined,
      })}
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
      empty={{
        icon: LogIn,
        title: isHistory ? "Histórico vazio" : "Nenhuma chegada",
        description: EMPTY_DESCRIPTION[scope],
      }}
      periodLabels={{ from: "Entrada prevista", to: "Saída prevista" }}
      action={
        isHistory
          ? undefined
          : { label: "Check-in", icon: CalendarCheck, onSelect: onCheckIn }
      }
      variant={variant}
    />
  );
}

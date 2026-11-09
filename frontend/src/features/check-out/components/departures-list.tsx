import { CalendarX, LogOut } from "lucide-react";

import { QueueList } from "@/shared/ui/queue-list";
import { StatusBadge } from "@/shared/ui/status-badge";

import { LateBadge } from "./late-badge";

import type { Departure, DeparturesScope } from "../api/types";

interface DeparturesListProps {
  departures: Departure[];
  scope: DeparturesScope;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onCheckOut: (departure: Departure) => void;
  variant?: "cards" | "rows";
}

const EMPTY_DESCRIPTION: Record<DeparturesScope, string> = {
  today: "Nenhuma saída prevista para hoje.",
  late: "Nenhum hóspede passou do horário de saída.",
  all_in_house: "Não há hóspedes hospedados no momento.",
  history: "Nenhuma estadia encerrada ainda.",
};

export function DeparturesList({
  departures,
  scope,
  isLoading,
  isError,
  onRetry,
  onCheckOut,
  variant = "cards",
}: DeparturesListProps) {
  const isHistory = scope === "history";

  return (
    <QueueList
      items={departures}
      toEntry={(departure) => ({
        id: departure.id,
        room: departure.room,
        guestName: departure.guest.name,
        code: departure.code,
        checkInDate: departure.check_in_date,
        checkOutDate: departure.check_out_date,
        usesParking: departure.uses_parking,
        highlighted: departure.is_late_check_out,
        badge: isHistory ? (
          <StatusBadge status={departure.status} />
        ) : departure.is_late_check_out ? (
          <LateBadge />
        ) : undefined,
      })}
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
      empty={{
        icon: LogOut,
        title: isHistory ? "Histórico vazio" : "Nenhuma saída",
        description: EMPTY_DESCRIPTION[scope],
      }}
      periodLabels={{ from: "Entrada", to: "Saída prevista" }}
      action={
        isHistory
          ? undefined
          : { label: "Check-out", icon: CalendarX, onSelect: onCheckOut }
      }
      variant={variant}
    />
  );
}

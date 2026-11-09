import { Badge, type BadgeProps } from "@/shared/ui/badge";

export type ReservationStatus = "RESERVED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED";

interface StatusUi {
  label: string;
  tone: NonNullable<BadgeProps["tone"]>;
}

// eslint-disable-next-line react-refresh/only-export-components -- fonte única junto do componente
export const RESERVATION_STATUS_UI: Record<ReservationStatus, StatusUi> = {
  RESERVED: { label: "Reservada", tone: "info" },
  CHECKED_IN: { label: "Hospedado", tone: "success" },
  CHECKED_OUT: { label: "Finalizada", tone: "neutral" },
  CANCELLED: { label: "Cancelada", tone: "danger" },
};

interface StatusBadgeProps {
  status: ReservationStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { label, tone } = RESERVATION_STATUS_UI[status];
  return (
    <Badge tone={tone} className={className}>
      {label}
    </Badge>
  );
}

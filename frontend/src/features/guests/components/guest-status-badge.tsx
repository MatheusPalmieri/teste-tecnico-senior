import { Badge } from "@/shared/ui/badge";
import type { ReservationStatus } from "@/shared/ui/status-badge";

const GUEST_STATUS_UI: Record<string, { label: string; tone: "success" | "info" }> = {
  CHECKED_IN: { label: "No hotel", tone: "success" },
  RESERVED: { label: "Aguardando check-in", tone: "info" },
};

interface GuestStatusBadgeProps {
  status: ReservationStatus | null;
}

export function GuestStatusBadge({ status }: GuestStatusBadgeProps) {
  const ui = status ? GUEST_STATUS_UI[status] : undefined;
  if (!ui) {
    return <Badge tone="neutral">Sem reserva ativa</Badge>;
  }
  return <Badge tone={ui.tone}>{ui.label}</Badge>;
}

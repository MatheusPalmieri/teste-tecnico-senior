import type { ReservationStatus } from "@/shared/ui/status-badge";

export type ReservationAction = "view" | "edit" | "check-in" | "check-out" | "cancel";

const ACTIONS_BY_STATUS: Record<ReservationStatus, ReservationAction[]> = {
  RESERVED: ["view", "edit", "check-in", "cancel"],
  CHECKED_IN: ["view", "check-out"],
  CHECKED_OUT: ["view"],
  CANCELLED: ["view"],
};

export function getAvailableActions(status: ReservationStatus): ReservationAction[] {
  return ACTIONS_BY_STATUS[status];
}

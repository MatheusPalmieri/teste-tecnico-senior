import type { ReservationMutationResult, ReservationWarning } from "../api/types";

export function formatReservationWarning(warning: ReservationWarning): string {
  const conflicting = warning.context?.conflicting_reservation;
  return conflicting ? `${warning.detail} (${conflicting})` : warning.detail;
}

export function reservationWarningMessages(result: ReservationMutationResult): string[] {
  return (result.warnings ?? []).map(formatReservationWarning);
}

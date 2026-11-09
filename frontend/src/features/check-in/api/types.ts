import type { ReservationStatus } from "@/shared/ui/status-badge";

export interface ArrivalGuest {
  id: string;
  name: string;
  document: string;
  phone: string;
}

export interface Arrival {
  id: string;
  code: string;
  guest: ArrivalGuest;
  status: ReservationStatus;
  check_in_date: string;
  check_out_date: string;
  room: string;
  uses_parking: boolean;
  is_overdue: boolean;
}

export type { ArrivalsFilters, ArrivalsScope } from "../schemas/arrivals-filters";

export interface CheckInInput {
  authorize_early?: boolean;
  uses_parking?: boolean;
  vehicle_plate?: string;
}

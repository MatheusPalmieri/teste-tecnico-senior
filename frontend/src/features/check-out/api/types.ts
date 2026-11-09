import type { Breakdown } from "@/features/reservations";
import type { ReservationStatus } from "@/shared/ui/status-badge";

export interface DepartureGuest {
  id: string;
  name: string;
  document: string;
  phone: string;
}

export interface Departure {
  id: string;
  code: string;
  guest: DepartureGuest;
  status: ReservationStatus;
  check_in_date: string;
  check_out_date: string;
  room: string;
  uses_parking: boolean;
  is_late_check_out: boolean;
}

export type { DeparturesFilters, DeparturesScope } from "../schemas/departures-filters";

export interface CheckOutPreview extends Breakdown {
  is_late_check_out: boolean;
  check_out_deadline: string;
  current_time: string;
}

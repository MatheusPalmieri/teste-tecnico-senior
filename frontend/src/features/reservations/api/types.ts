import type { SortDirection } from "@/shared/lib/sorting";

import type { ReservationView } from "../schemas/reservation-filters";

import type { ReservationStatus } from "@/shared/ui/status-badge";

export interface ReservationGuestSummary {
  id: string;
  name: string;
  document: string;
  phone: string;
}

export type ChargeKind = "NIGHTLY" | "PARKING" | "LATE_CHECK_OUT";
export type DayType = "WEEKDAY" | "WEEKEND" | null;

export interface ChargeLine {
  kind: ChargeKind;
  description: string;
  day_type: DayType;
  quantity: number;
  unit_amount: string;
  amount: string;
}

export interface Breakdown {
  nights: number;
  lines: ChargeLine[];
  nightly_subtotal: string;
  parking_subtotal: string;
  late_check_out_fee: string;
  total: string;
}

export interface Reservation {
  id: string;
  code: string;
  guest: ReservationGuestSummary;
  status: ReservationStatus;
  check_in_date: string;
  check_out_date: string;
  room: string;
  uses_parking: boolean;
  vehicle_plate: string;
  notes: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
  early_check_in_authorized: boolean;
  total_amount: string | null;
  charges_snapshot: Breakdown | null;
  estimated_total: string | null;
  created_at: string;
}

export interface ReservationWarning {
  code: string;
  detail: string;
  context: Record<string, string>;
}

export interface ReservationMutationResult extends Reservation {
  warnings: ReservationWarning[];
}

export interface ReservationInput {
  guest_id: string;
  room: string;
  check_in_date: string;
  check_out_date: string;
  uses_parking: boolean;
  vehicle_plate?: string;
  notes?: string;
}

export interface ReservationListFilters {
  search: string;
  view?: ReservationView;
  status: string[];
  date_from: string;
  date_to: string;
  uses_parking?: "" | "1" | "0";
  sort?: string;
  order?: SortDirection;
  page: number;
  page_size?: number;
}

export interface AvailableRooms {
  total_rooms: number;
  available: string[];
  occupied: string[];
}

export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

import type { SortDirection } from "@/shared/lib/sorting";

import type { ReservationStatus } from "@/shared/ui/status-badge";

export interface GuestReservationSummary {
  id: string;
  code: string;
  check_in_date: string;
  check_out_date: string;
  room: string;
  uses_parking: boolean;
  status: ReservationStatus;
}

export interface Guest {
  id: string;
  name: string;
  document_type: "CPF" | "RG";
  document: string;
  phone: string;
  email: string;
  notes: string;
  current_status: ReservationStatus | null;
  current_reservation: GuestReservationSummary | null;
  created_at: string;
  updated_at: string;
}

export interface GuestDetail extends Guest {
  reservations: GuestReservationSummary[];
}

export interface GuestInput {
  name: string;
  document: string;
  phone: string;
  email?: string;
  notes?: string;
}

export interface GuestListFilters {
  search: string;
  status: "" | "in_house" | "awaiting_check_in";
  uses_parking?: "" | "1" | "0";
  sort?: string;
  order?: SortDirection;
  page: number;
  page_size?: number;
}

export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

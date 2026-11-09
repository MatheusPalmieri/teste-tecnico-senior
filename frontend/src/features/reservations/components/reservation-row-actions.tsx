import { CalendarCheck, CalendarX, Eye, Pencil, XCircle } from "lucide-react";

import { DropdownMenuItem } from "@/shared/ui/dropdown-menu";
import { RowActionsMenu } from "@/shared/ui/row-actions-menu";

import { getAvailableActions } from "../lib/reservation-actions";

import type { Reservation } from "../api/types";

interface ReservationRowActionsProps {
  reservation: Reservation;
  onView: (reservation: Reservation) => void;
  onEdit: (reservation: Reservation) => void;
  onCancel: (reservation: Reservation) => void;
  onCheckIn?: (reservation: Reservation) => void;
  onCheckOut?: (reservation: Reservation) => void;
}

export function ReservationRowActions({
  reservation,
  onView,
  onEdit,
  onCancel,
  onCheckIn,
  onCheckOut,
}: ReservationRowActionsProps) {
  const actions = getAvailableActions(reservation.status);

  return (
    <RowActionsMenu label={`Ações da reserva de ${reservation.guest.name}`}>
      {actions.includes("view") && (
        <DropdownMenuItem onSelect={() => onView(reservation)}>
          <Eye className="h-4 w-4" />
          Ver reserva
        </DropdownMenuItem>
      )}
      {actions.includes("edit") && (
        <DropdownMenuItem onSelect={() => onEdit(reservation)}>
          <Pencil className="h-4 w-4" />
          Editar reserva
        </DropdownMenuItem>
      )}
      {actions.includes("check-in") && onCheckIn && (
        <DropdownMenuItem onSelect={() => onCheckIn(reservation)}>
          <CalendarCheck className="h-4 w-4" />
          Fazer check-in
        </DropdownMenuItem>
      )}
      {actions.includes("check-out") && onCheckOut && (
        <DropdownMenuItem onSelect={() => onCheckOut(reservation)}>
          <CalendarX className="h-4 w-4" />
          Fazer check-out
        </DropdownMenuItem>
      )}
      {actions.includes("cancel") && (
        <DropdownMenuItem destructive onSelect={() => onCancel(reservation)}>
          <XCircle className="h-4 w-4" />
          Cancelar reserva
        </DropdownMenuItem>
      )}
    </RowActionsMenu>
  );
}

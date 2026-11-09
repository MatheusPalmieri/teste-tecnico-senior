import type { ColumnDef } from "@tanstack/react-table";
import { CalendarPlus2 } from "lucide-react";

import { formatDate } from "@/shared/lib/date";
import { Button } from "@/shared/ui/button";
import { DataTable, type DataTableViewProps } from "@/shared/ui/data-table";
import { Money } from "@/shared/ui/money";
import { StatusBadge } from "@/shared/ui/status-badge";

import { ReservationRowActions } from "./reservation-row-actions";

import type { Reservation } from "../api/types";

interface ReservationsTableProps extends DataTableViewProps {
  reservations: Reservation[];
  onView: (reservation: Reservation) => void;
  onEdit: (reservation: Reservation) => void;
  onCancel: (reservation: Reservation) => void;
  onCreate: () => void;
  onCheckIn?: (reservation: Reservation) => void;
  onCheckOut?: (reservation: Reservation) => void;
}

export function ReservationsTable({
  reservations,
  onView,
  onEdit,
  onCancel,
  onCreate,
  onCheckIn,
  onCheckOut,
  ...view
}: ReservationsTableProps) {
  const columns: ColumnDef<Reservation, unknown>[] = [
    { id: "code", accessorKey: "code", header: "Código", enableSorting: true },
    {
      id: "guest",
      accessorFn: (reservation) => reservation.guest.name,
      header: "Hóspede",
      enableSorting: true,
      cell: ({ row }) => row.original.guest.name,
    },
    {
      id: "period",
      header: "Período",
      meta: { skeleton: { width: 176 } },
      enableSorting: true,
      cell: ({ row }) =>
        `${formatDate(row.original.check_in_date)} - ${formatDate(row.original.check_out_date)}`,
    },
    { id: "room", accessorKey: "room", header: "Quarto", enableSorting: true },
    {
      id: "status",
      header: "Status",
      meta: { skeleton: { shape: "badge", width: 84 } },
      enableSorting: true,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "total",
      header: "Total",
      meta: { skeleton: { width: 80 } },
      cell: ({ row }) => {
        const value = row.original.total_amount ?? row.original.estimated_total;
        return value ? <Money value={value} /> : "-";
      },
    },
    {
      id: "actions",
      header: "",
      meta: { skeleton: { shape: "action" } },
      cell: ({ row }) => (
        <ReservationRowActions
          reservation={row.original}
          onView={onView}
          onEdit={onEdit}
          onCancel={onCancel}
          onCheckIn={onCheckIn}
          onCheckOut={onCheckOut}
        />
      ),
    },
  ];

  return (
    <DataTable
      {...view}
      columns={columns}
      data={reservations}
      emptyState={{
        title: "Nenhuma reserva ainda",
        description: "Crie a primeira reserva para começar.",
        action: (
          <Button onClick={onCreate}>
            <CalendarPlus2 className="h-4 w-4" />
            Nova reserva
          </Button>
        ),
      }}
    />
  );
}

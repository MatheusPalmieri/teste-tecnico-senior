import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, Trash2, UserRoundPlus } from "lucide-react";

import { formatDate } from "@/shared/lib/date";
import { formatDocument } from "@/shared/lib/document";
import { formatPhone } from "@/shared/lib/phone";
import { Button } from "@/shared/ui/button";
import { DataTable, type DataTableViewProps } from "@/shared/ui/data-table";
import { DropdownMenuItem } from "@/shared/ui/dropdown-menu";
import { RowActionsMenu } from "@/shared/ui/row-actions-menu";

import { GuestStatusBadge } from "./guest-status-badge";

import type { Guest } from "../api/types";

interface GuestsTableProps extends DataTableViewProps {
  guests: Guest[];
  onView: (guest: Guest) => void;
  onEdit: (guest: Guest) => void;
  onDelete: (guest: Guest) => void;
  onCreate: () => void;
}

export function GuestsTable({
  guests,
  onView,
  onEdit,
  onDelete,
  onCreate,
  ...view
}: GuestsTableProps) {
  const columns: ColumnDef<Guest, unknown>[] = [
    {
      id: "name",
      accessorKey: "name",
      header: "Nome",
      enableSorting: true,
      meta: { skeleton: { width: 168 } },
    },
    {
      id: "document",
      accessorKey: "document",
      header: "Documento",
      enableSorting: true,
      meta: { skeleton: { width: 128 } },
      cell: ({ row }) => (
        <span className="flex items-baseline gap-1.5">
          <span>{formatDocument(row.original.document, row.original.document_type)}</span>
          <span className="text-caption font-normal text-neutral-500">
            {row.original.document_type}
          </span>
        </span>
      ),
    },
    {
      id: "phone",
      accessorKey: "phone",
      header: "Telefone",
      enableSorting: true,
      meta: { skeleton: { width: 120 } },
      cell: ({ row }) => formatPhone(row.original.phone),
    },
    {
      id: "status",
      header: "Situação",
      meta: { skeleton: { shape: "badge", width: 92 } },
      cell: ({ row }) => <GuestStatusBadge status={row.original.current_status} />,
    },
    {
      id: "reservation",
      header: "Reserva atual",
      meta: { skeleton: { width: 224 } },
      cell: ({ row }) => {
        const reservation = row.original.current_reservation;
        if (!reservation) return <span className="text-neutral-500">-</span>;
        return `${formatDate(reservation.check_in_date)} - ${formatDate(reservation.check_out_date)} · Quarto ${reservation.room}`;
      },
    },
    {
      id: "parking",
      header: "Vaga",
      meta: { skeleton: { width: 32 } },
      cell: ({ row }) => (row.original.current_reservation?.uses_parking ? "Sim" : "-"),
    },
    {
      id: "actions",
      header: "",
      meta: { skeleton: { shape: "action" } },
      cell: ({ row }) => (
        <RowActionsMenu label={`Ações de ${row.original.name}`}>
          <DropdownMenuItem onSelect={() => onView(row.original)}>
            <Eye className="h-4 w-4" />
            Ver hóspede
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onEdit(row.original)}>
            <Pencil className="h-4 w-4" />
            Editar hóspede
          </DropdownMenuItem>
          <DropdownMenuItem destructive onSelect={() => onDelete(row.original)}>
            <Trash2 className="h-4 w-4" />
            Excluir hóspede
          </DropdownMenuItem>
        </RowActionsMenu>
      ),
    },
  ];

  return (
    <DataTable
      {...view}
      columns={columns}
      data={guests}
      emptyState={{
        title: "Nenhum hóspede cadastrado",
        description: "Cadastre o primeiro hóspede para começar.",
        action: (
          <Button onClick={onCreate}>
            <UserRoundPlus className="h-4 w-4" />
            Novo hóspede
          </Button>
        ),
      }}
    />
  );
}

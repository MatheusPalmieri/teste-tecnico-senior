import { useState } from "react";
import { UserRoundPlus } from "lucide-react";

import { useListView } from "@/shared/hooks/use-list-view";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";

import { GuestDeleteDialog } from "../components/guest-delete-dialog";
import { GuestDetailDialog } from "../components/guest-detail-dialog";
import { GuestFormDialog } from "../components/guest-form-dialog";
import { GuestsFilterBar } from "../components/guests-filter-bar";
import { GuestsTable } from "../components/guests-table";
import { useGuests } from "../hooks/use-guests";
import { guestFiltersSchema } from "../schemas/guest-filters";

import type { Guest } from "../api/types";

export function GuestsPage() {
  const {
    filters,
    setFilter,
    clearAll,
    activeFilterCount,
    sorting,
    onSortingChange,
    buildPagination,
  } = useListView(guestFiltersSchema);
  const { data, isLoading, isError, refetch } = useGuests(filters);

  const [formGuest, setFormGuest] = useState<Guest | null | undefined>(undefined);
  const [detailGuestId, setDetailGuestId] = useState<string | null>(null);
  const [deletingGuest, setDeletingGuest] = useState<Guest | null>(null);

  const isFiltered =
    filters.search !== "" || filters.status !== "" || filters.uses_parking !== "";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Hóspedes"
        description={
          data ? `${data.count} hóspedes encontrados` : "Cadastro e busca de hóspedes."
        }
        actions={
          <Button onClick={() => setFormGuest(null)}>
            <UserRoundPlus className="h-4 w-4" />
            Novo hóspede
          </Button>
        }
      />

      <GuestsFilterBar
        filters={filters}
        setFilter={setFilter}
        clearAll={clearAll}
        activeFilterCount={activeFilterCount}
      />

      <GuestsTable
        guests={data?.results ?? []}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        isFiltered={isFiltered}
        sorting={sorting}
        onSortingChange={onSortingChange}
        pagination={buildPagination(data?.count)}
        onView={(guest) => setDetailGuestId(guest.id)}
        onEdit={(guest) => setFormGuest(guest)}
        onDelete={(guest) => setDeletingGuest(guest)}
        onCreate={() => setFormGuest(null)}
      />

      <GuestFormDialog
        open={formGuest !== undefined}
        onOpenChange={(open) => !open && setFormGuest(undefined)}
        guest={formGuest}
      />

      <GuestDetailDialog
        guestId={detailGuestId}
        onOpenChange={() => setDetailGuestId(null)}
      />

      <GuestDeleteDialog
        guest={deletingGuest}
        onOpenChange={(open) => !open && setDeletingGuest(null)}
      />
    </div>
  );
}

export default GuestsPage;

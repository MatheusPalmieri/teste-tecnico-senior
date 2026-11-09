import { BedDouble } from "lucide-react";
import { useNavigate } from "react-router";

import { useGuests } from "@/features/guests";
import { formatPhone } from "@/shared/lib/phone";
import { QueryList } from "@/shared/ui/query-list";

import { DashboardCard } from "./dashboard-card";

export function InHouseCard() {
  const { data, isLoading, isError, refetch } = useGuests({
    search: "",
    status: "in_house",
    page: 1,
  });
  const navigate = useNavigate();

  return (
    <DashboardCard
      title="Hóspedes no hotel"
      action={
        <button
          type="button"
          onClick={() => navigate("/hospedes?status=in_house")}
          className="cursor-pointer text-small text-primary-600 underline-offset-2 hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          Ver todos
        </button>
      }
    >
      <QueryList
        items={data?.results ?? []}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        getItemKey={(guest) => guest.id}
        emptyIcon={BedDouble}
        emptyTitle="Nenhum hóspede no hotel"
        skeletonCount={3}
        skeletonLines={1}
        skeletonTrailing="text"
        bordered={false}
        itemClassName="py-2"
        renderItem={(guest) => (
          <>
            <span className="text-body-strong">{guest.name}</span>
            <span className="text-small text-neutral-500">
              Quarto {guest.current_reservation?.room} · {formatPhone(guest.phone)}
            </span>
          </>
        )}
      />
    </DashboardCard>
  );
}

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { formatDate } from "@/shared/lib/date";
import { Button } from "@/shared/ui/button";
import { QueryList } from "@/shared/ui/query-list";
import { QueueCard, QueueCardSkeleton } from "@/shared/ui/queue-card";

export interface QueueEntry {
  id: string;
  room: string;
  guestName: string;
  code: string;
  checkInDate: string;
  checkOutDate: string;
  usesParking: boolean;
  highlighted: boolean;
  badge?: ReactNode;
}

interface QueueListProps<TItem> {
  items: TItem[];
  toEntry: (item: TItem) => QueueEntry;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  empty: { icon: LucideIcon; title: string; description: string };
  periodLabels: { from: string; to: string };
  action?: { label: string; icon: LucideIcon; onSelect: (item: TItem) => void };
  variant?: "cards" | "rows";
}

export function QueueList<TItem>({
  items,
  toEntry,
  isLoading,
  isError,
  onRetry,
  empty,
  periodLabels,
  action,
  variant = "cards",
}: QueueListProps<TItem>) {
  const common = {
    items,
    isLoading,
    isError,
    onRetry,
    getItemKey: (item: TItem) => toEntry(item).id,
    emptyIcon: empty.icon,
    emptyTitle: empty.title,
    emptyDescription: empty.description,
  };

  function actionButton(item: TItem): ReactNode {
    if (!action) return null;
    const ActionIcon = action.icon;
    return (
      <Button size="sm" onClick={() => action.onSelect(item)}>
        <ActionIcon className="h-4 w-4" aria-hidden="true" />
        {action.label}
      </Button>
    );
  }

  if (variant === "rows") {
    return (
      <QueryList
        {...common}
        renderItem={(item) => {
          const entry = toEntry(item);
          return (
            <>
              <div className="flex min-w-0 flex-col">
                <div className="flex items-center gap-2">
                  <span className="truncate text-body-strong">{entry.guestName}</span>
                  {entry.badge}
                </div>
                <span className="text-small text-neutral-600 tabular-nums">
                  {formatDate(entry.checkInDate)} - {formatDate(entry.checkOutDate)} ·
                  Quarto {entry.room}
                </span>
              </div>
              {actionButton(item)}
            </>
          );
        }}
      />
    );
  }

  return (
    <QueryList
      {...common}
      layout="grid"
      skeletonCount={6}
      renderSkeletonItem={() => <QueueCardSkeleton />}
      renderItem={(item) => {
        const entry = toEntry(item);
        return (
          <QueueCard
            room={entry.room}
            guestName={entry.guestName}
            code={entry.code}
            checkInDate={entry.checkInDate}
            checkOutDate={entry.checkOutDate}
            usesParking={entry.usesParking}
            highlighted={entry.highlighted}
            badge={entry.badge}
            fromLabel={periodLabels.from}
            toLabel={periodLabels.to}
            action={actionButton(item)}
          />
        );
      }}
    />
  );
}

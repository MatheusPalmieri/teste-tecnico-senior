import { ArrowRight, Car } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/shared/lib/cn";
import { formatDate, nightsBetween } from "@/shared/lib/date";
import { Skeleton, SkeletonText } from "@/shared/ui/skeleton";

interface QueueCardProps {
  room: string;
  guestName: string;
  code: string;
  checkInDate: string;
  checkOutDate: string;
  usesParking: boolean;
  highlighted?: boolean;
  badge?: ReactNode;
  fromLabel: string;
  toLabel: string;
  action?: ReactNode;
}

export function QueueCard({
  room,
  guestName,
  code,
  checkInDate,
  checkOutDate,
  usesParking,
  highlighted = false,
  badge,
  fromLabel,
  toLabel,
  action,
}: QueueCardProps) {
  const nights = nightsBetween(checkInDate, checkOutDate);

  return (
    <article
      className={cn(
        "flex h-full flex-col gap-4 rounded-xl border p-4 transition-colors duration-150",
        highlighted
          ? "border-warning-border bg-warning-bg"
          : "border-neutral-200 bg-white hover:border-neutral-300",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-h2 tabular-nums",
            highlighted
              ? "bg-warning-border/60 text-warning-text"
              : "bg-primary-50 text-primary-700",
          )}
        >
          <span aria-hidden="true">{room}</span>
          <span className="sr-only">Quarto {room}</span>
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-body-strong text-neutral-900">{guestName}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-small text-neutral-600 tabular-nums">{code}</span>
            {badge}
          </span>
        </div>
      </div>

      <dl className="flex items-end gap-3">
        <div className="flex flex-col">
          <dt className="text-caption text-neutral-600">{fromLabel}</dt>
          <dd className="text-body-strong text-neutral-800 tabular-nums">
            {formatDate(checkInDate)}
          </dd>
        </div>
        <ArrowRight
          className="mb-1 h-4 w-4 shrink-0 text-neutral-500"
          aria-hidden="true"
        />
        <div className="flex flex-col">
          <dt className="text-caption text-neutral-600">{toLabel}</dt>
          <dd className="text-body-strong text-neutral-800 tabular-nums">
            {formatDate(checkOutDate)}
          </dd>
        </div>
      </dl>

      <div
        className={cn(
          "mt-auto flex items-center justify-between gap-3 border-t pt-3",
          highlighted ? "border-warning-border" : "border-neutral-200",
        )}
      >
        <span className="flex items-center gap-1.5 text-small text-neutral-600">
          {nights} {nights === 1 ? "noite" : "noites"}
          {usesParking && (
            <>
              <span aria-hidden="true">·</span>
              <Car className="h-4 w-4 shrink-0 text-neutral-500" aria-hidden="true" />
              Vaga
            </>
          )}
        </span>

        {action}
      </div>
    </article>
  );
}

export function QueueCardSkeleton() {
  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
        <div className="flex min-w-0 flex-1 flex-col">
          <SkeletonText variant="body-strong" width={168} />
          <SkeletonText variant="small" width={96} />
        </div>
      </div>
      <div className="flex gap-6">
        <div className="flex flex-col">
          <SkeletonText variant="caption" width={80} />
          <SkeletonText variant="body-strong" width={88} />
        </div>
        <div className="flex flex-col">
          <SkeletonText variant="caption" width={80} />
          <SkeletonText variant="body-strong" width={88} />
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-neutral-200 pt-3">
        <SkeletonText variant="small" width={72} className="w-auto" />
        <Skeleton className="h-9 w-28 shrink-0 rounded-md" />
      </div>
    </div>
  );
}

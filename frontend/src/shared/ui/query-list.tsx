import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/shared/lib/cn";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { Skeleton, SkeletonText } from "@/shared/ui/skeleton";

interface QueryListProps<T> {
  items: T[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  renderItem: (item: T) => ReactNode;
  getItemKey: (item: T) => string;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription?: string;
  layout?: "rows" | "grid";
  skeletonCount?: number;
  skeletonLines?: 1 | 2;
  skeletonTrailing?: "none" | "action" | "text";
  renderSkeletonItem?: (index: number) => ReactNode;
  bordered?: boolean;
  itemClassName?: string;
  className?: string;
}

export function QueryList<T>({
  items,
  isLoading,
  isError,
  onRetry,
  renderItem,
  getItemKey,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  layout = "rows",
  skeletonCount = 4,
  skeletonLines = 2,
  skeletonTrailing = "action",
  renderSkeletonItem,
  bordered = true,
  itemClassName,
  className,
}: QueryListProps<T>) {
  const isGrid = layout === "grid";

  const shellClassName = cn(
    isGrid
      ? "grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-3"
      : cn(
          "flex flex-col divide-y divide-neutral-200",
          bordered && "rounded-lg border border-neutral-200",
        ),
    className,
  );
  const itemClassNames = isGrid
    ? itemClassName
    : cn("flex items-center justify-between gap-3", itemClassName ?? "p-3");

  if (isLoading) {
    return (
      <div className={shellClassName} aria-hidden="true">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <div key={index} className={itemClassNames}>
            {renderSkeletonItem ? (
              renderSkeletonItem(index)
            ) : (
              <>
                <div className="flex min-w-0 flex-1 flex-col">
                  <SkeletonText
                    variant="body-strong"
                    width={index % 2 === 0 ? 168 : 136}
                  />
                  {skeletonLines === 2 && (
                    <SkeletonText variant="small" width={index % 2 === 0 ? 232 : 208} />
                  )}
                </div>
                {skeletonTrailing === "action" && (
                  <Skeleton className="h-9 w-28 shrink-0 rounded-md" />
                )}
                {skeletonTrailing === "text" && (
                  <SkeletonText variant="small" width={144} className="w-auto shrink-0" />
                )}
              </>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return <ErrorState onRetry={onRetry} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
    );
  }

  return (
    <ul className={shellClassName}>
      {items.map((item) => (
        <li key={getItemKey(item)} className={itemClassNames}>
          {renderItem(item)}
        </li>
      ))}
    </ul>
  );
}

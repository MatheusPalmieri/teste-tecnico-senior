import { Skeleton, SkeletonText } from "@/shared/ui/skeleton";

interface PageSkeletonProps {
  title?: string;
  description?: string;
  variant?: "table" | "list" | "dashboard" | "panels";
}

export function PageSkeleton({
  title,
  description,
  variant = "panels",
}: PageSkeletonProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          {title ? (
            <h1 className="text-h1 text-neutral-900">{title}</h1>
          ) : (
            <SkeletonText variant="h1" width={208} />
          )}
          {description ? (
            <p className="text-small text-neutral-500">{description}</p>
          ) : (
            <SkeletonText variant="small" width={264} />
          )}
        </div>
      </div>

      {(variant === "table" || variant === "list") && <FilterBarSkeleton />}

      {variant === "table" && <TableSkeleton />}
      {variant === "list" && <ListSkeleton />}
      {variant === "dashboard" && <DashboardSkeleton />}
      {variant === "panels" && <PanelsSkeleton />}
    </div>
  );
}

function FilterBarSkeleton() {
  return (
    <div className="flex items-center justify-between gap-2">
      <Skeleton className="h-10 w-56 rounded-lg" />
      <Skeleton className="h-10 w-72 rounded-lg" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border border-neutral-200">
        <div className="h-9 border-b border-neutral-200 bg-neutral-100" />
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="flex h-12 items-center gap-6 border-b border-neutral-200 px-3.5 last:border-b-0"
          >
            <SkeletonText variant="small" width={168} />
            <SkeletonText variant="small" width={128} className="hidden sm:flex" />
            <SkeletonText variant="small" width={192} className="hidden lg:flex" />
            <Skeleton className="ml-auto h-7 w-7 shrink-0 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200"
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center justify-between gap-3 p-3">
          <div className="flex min-w-0 flex-1 flex-col">
            <SkeletonText variant="body-strong" width={index % 2 === 0 ? 168 : 136} />
            <SkeletonText variant="small" width={index % 2 === 0 ? 232 : 208} />
          </div>
          <Skeleton className="h-9 w-28 shrink-0 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} className="h-[92px] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-60 rounded-xl" />
        <Skeleton className="h-60 rounded-xl" />
      </div>
    </div>
  );
}

function PanelsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-72 max-w-2xl rounded-xl" />
      <Skeleton className="h-40 max-w-2xl rounded-xl" />
    </div>
  );
}

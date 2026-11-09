import { SkeletonText } from "@/shared/ui/skeleton";

export function ChargesBreakdownSkeleton() {
  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4"
      aria-hidden="true"
    >
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <SkeletonText variant="body" width={index % 2 === 0 ? 208 : 176} />
            <SkeletonText variant="body-strong" width={72} className="w-auto shrink-0" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1 border-t border-neutral-200 pt-3">
        {[0, 1].map((index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <SkeletonText variant="small" width={144} />
            <SkeletonText variant="small" width={64} className="w-auto shrink-0" />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-lg border border-primary-100 bg-primary-50 px-4 py-3">
        <SkeletonText variant="h3" width={96} />
        <SkeletonText variant="h1" width={112} className="w-auto shrink-0" />
      </div>
    </div>
  );
}

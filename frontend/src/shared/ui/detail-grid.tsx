import type { ReactNode } from "react";

import { cn } from "@/shared/lib/cn";
import { SkeletonField } from "@/shared/ui/skeleton";

interface DetailGridProps {
  bordered?: boolean;
  className?: string;
  children: ReactNode;
}

export function DetailGrid({ bordered = false, className, children }: DetailGridProps) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-3 text-body",
        bordered && "rounded-lg border border-neutral-200 p-3",
        className,
      )}
    >
      {children}
    </dl>
  );
}

interface DetailItemProps {
  label: string;
  wide?: boolean;
  children: ReactNode;
}

export function DetailItem({ label, wide = false, children }: DetailItemProps) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <dt className="text-caption uppercase text-neutral-500">{label}</dt>
      <dd className="text-body-strong">{children}</dd>
    </div>
  );
}

interface DetailGridSkeletonProps {
  bordered?: boolean;
  fields: { width: number; wide?: boolean }[];
}

export function DetailGridSkeleton({
  bordered = false,
  fields,
}: DetailGridSkeletonProps) {
  return (
    <dl
      aria-hidden="true"
      className={cn(
        "grid grid-cols-2 gap-3",
        bordered && "rounded-lg border border-neutral-200 p-3",
      )}
    >
      {fields.map((field, index) => (
        <SkeletonField
          key={index}
          width={field.width}
          className={field.wide ? "col-span-2" : undefined}
        />
      ))}
    </dl>
  );
}

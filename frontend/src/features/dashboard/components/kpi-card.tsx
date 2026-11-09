import type { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router";

import { cn } from "@/shared/lib/cn";
import { SkeletonText } from "@/shared/ui/skeleton";

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  to?: string;
  isLoading?: boolean;
  className?: string;
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  to,
  isLoading,
  className,
}: KpiCardProps) {
  const navigate = useNavigate();
  const clickable = Boolean(to);

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => navigate(to as string) : undefined}
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") navigate(to as string);
            }
          : undefined
      }
      className={cn(
        "relative overflow-hidden rounded-xl border border-neutral-200 bg-card p-4 shadow-sm",
        clickable &&
          "cursor-pointer transition-colors hover:bg-neutral-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-[3px] bg-primary-500" />
      <div className="flex items-center gap-2 text-neutral-500">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="text-caption uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1 text-display tabular-nums text-neutral-900">
        {isLoading ? <SkeletonText variant="display" width={72} /> : value}
      </p>
    </div>
  );
}

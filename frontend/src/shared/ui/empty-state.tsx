import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/shared/lib/cn";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 py-16 text-center", className)}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
        <Icon className="h-8 w-8 text-primary-200" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-body-strong text-neutral-800">{title}</p>
        {description && <p className="text-small text-neutral-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

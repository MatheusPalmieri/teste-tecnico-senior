import { AlertTriangle, Info, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/shared/lib/cn";

export type CalloutTone = "info" | "warning" | "danger";

const TONE_CLASSES: Record<CalloutTone, string> = {
  info: "border-info-border bg-info-bg text-info-text",
  warning: "border-warning-border bg-warning-bg text-warning-text",
  danger: "border-danger-border bg-danger-bg text-danger-text",
};

const TONE_ICONS: Record<CalloutTone, LucideIcon> = {
  info: Info,
  warning: AlertTriangle,
  danger: AlertTriangle,
};

interface CalloutProps {
  tone?: CalloutTone;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Callout({ tone = "warning", title, children, className }: CalloutProps) {
  const Icon = TONE_ICONS[tone];

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border p-3 text-small",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>
        {title && <p className="font-medium">{title}</p>}
        <p>{children}</p>
      </div>
    </div>
  );
}

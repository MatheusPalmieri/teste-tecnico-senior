import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/shared/lib/cn";

// eslint-disable-next-line react-refresh/only-export-components -- padrão shadcn/ui: variantes junto do componente
export const badgeVariants = cva(
  "inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-caption font-medium",
  {
    variants: {
      tone: {
        neutral: "border-neutral-200 bg-neutral-100 text-neutral-600",
        success: "border-success-border bg-success-bg text-success-text",
        info: "border-info-border bg-info-bg text-info-text",
        warning: "border-warning-border bg-warning-bg text-warning-text",
        danger: "border-danger-border bg-danger-bg text-danger-text",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

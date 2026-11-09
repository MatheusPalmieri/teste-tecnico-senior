import type { CSSProperties, HTMLAttributes } from "react";

import { cn } from "@/shared/lib/cn";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-neutral-200", className)}
      {...props}
    />
  );
}

const TEXT_METRICS = {
  display: { lineHeight: 38, barHeight: 20 },
  h1: { lineHeight: 32, barHeight: 16 },
  h2: { lineHeight: 28, barHeight: 14 },
  h3: { lineHeight: 24, barHeight: 12 },
  body: { lineHeight: 20, barHeight: 10 },
  "body-strong": { lineHeight: 20, barHeight: 10 },
  small: { lineHeight: 18, barHeight: 10 },
  caption: { lineHeight: 16, barHeight: 8 },
} as const;

export type SkeletonTextVariant = keyof typeof TEXT_METRICS;

interface SkeletonTextProps {
  variant?: SkeletonTextVariant;
  width?: number | string;
  className?: string;
}

export function SkeletonText({
  variant = "body",
  width = "100%",
  className,
}: SkeletonTextProps) {
  const { lineHeight, barHeight } = TEXT_METRICS[variant];
  const outerStyle: CSSProperties = { height: lineHeight };
  const barStyle: CSSProperties = { height: barHeight, width };

  return (
    <span
      aria-hidden="true"
      className={cn("flex w-full items-center", className)}
      style={outerStyle}
    >
      <span
        className="block max-w-full animate-pulse rounded-sm bg-neutral-200"
        style={barStyle}
      />
    </span>
  );
}

interface SkeletonFieldProps {
  width?: number;
  className?: string;
}

export function SkeletonField({ width = 128, className }: SkeletonFieldProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <SkeletonText variant="caption" width={Math.round(width * 0.6)} />
      <SkeletonText variant="body-strong" width={width} />
    </div>
  );
}

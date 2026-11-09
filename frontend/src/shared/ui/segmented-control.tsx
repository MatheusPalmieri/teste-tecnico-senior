import type { ReactNode } from "react";

import { cn } from "@/shared/lib/cn";

interface SegmentedControlOption<TValue extends string> {
  value: TValue;
  label: ReactNode;
}

interface SegmentedControlProps<TValue extends string> {
  value: TValue;
  onValueChange: (value: TValue) => void;
  options: SegmentedControlOption<TValue>[];
  label: string;
  className?: string;
}

export function SegmentedControl<TValue extends string>({
  value,
  onValueChange,
  options,
  label,
  className,
}: SegmentedControlProps<TValue>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex h-10 items-center gap-1 rounded-md bg-neutral-100 p-1 text-neutral-600",
        className,
      )}
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            data-state={active ? "active" : "inactive"}
            onClick={() => onValueChange(option.value)}
            className="inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-body-strong transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-neutral-900 data-[state=active]:shadow-sm"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

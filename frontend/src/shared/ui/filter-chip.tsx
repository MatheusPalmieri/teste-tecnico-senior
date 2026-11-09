import { Check, ChevronDown, X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/shared/lib/cn";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

interface FilterChipProps {
  label: string;
  valueLabel: string | null;
  showValue?: boolean;
  onClear: () => void;
  title?: string | null;
  icon?: ReactNode;
  align?: "start" | "center" | "end";
  contentClassName?: string;
  children: ReactNode;
}

export function FilterChip({
  label,
  valueLabel,
  showValue = false,
  onClear,
  title,
  icon,
  align = "start",
  contentClassName,
  children,
}: FilterChipProps) {
  const isActive = valueLabel !== null;

  return (
    <div
      className={cn(
        "inline-flex h-8 items-center rounded-md border text-small transition-colors duration-150",
        isActive
          ? "border-primary-200 bg-primary-50 text-primary-700"
          : "border-dashed border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400 hover:text-neutral-800",
      )}
    >
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-full max-w-[18rem] cursor-pointer items-center gap-1.5 rounded-md px-2.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
          >
            {icon}
            <span className="shrink-0">
              {label}
              {isActive && showValue ? ":" : ""}
            </span>
            {isActive &&
              (showValue ? (
                <span className="truncate font-medium tabular-nums">{valueLabel}</span>
              ) : (
                <span className="sr-only">: {valueLabel}</span>
              ))}
            <ChevronDown className="size-3 shrink-0 opacity-60" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent align={align} className={cn("w-60 p-1.5", contentClassName)}>
          {title !== null && (
            <p className="px-2 pb-1 pt-0.5 text-caption uppercase tracking-wide text-neutral-500">
              {title ?? label}
            </p>
          )}
          {children}
        </PopoverContent>
      </Popover>

      <span aria-hidden={!isActive} className="flex w-5 shrink-0 justify-center">
        {isActive && (
          <button
            type="button"
            aria-label={`Remover filtro ${label}`}
            onClick={onClear}
            className="flex size-4 cursor-pointer items-center justify-center rounded-full text-primary-700 hover:bg-primary-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        )}
      </span>
    </div>
  );
}

export interface FilterChipOption<TValue extends string> {
  value: TValue;
  label: string;
}

interface FilterChipSelectProps<TValue extends string> {
  label: string;
  options: readonly FilterChipOption<TValue>[];
  value: TValue | "";
  onChange: (value: TValue | "") => void;
  title?: string | null;
  icon?: ReactNode;
  align?: "start" | "center" | "end";
}

export function FilterChipSelect<TValue extends string>({
  label,
  options,
  value,
  onChange,
  title,
  icon,
  align,
}: FilterChipSelectProps<TValue>) {
  const selected = options.find((option) => option.value === value);

  return (
    <FilterChip
      label={label}
      valueLabel={selected ? selected.label : null}
      onClear={() => onChange("")}
      title={title}
      icon={icon}
      align={align}
    >
      <div className="flex flex-col">
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(isSelected ? "" : option.value)}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-small text-neutral-800 hover:bg-neutral-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <span className="flex-1">{option.label}</span>
              {isSelected && (
                <Check className="size-4 text-primary-500" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
    </FilterChip>
  );
}

interface FilterChipMultiSelectProps<TValue extends string> {
  label: string;
  options: readonly FilterChipOption<TValue>[];
  value: readonly TValue[];
  onChange: (value: TValue[]) => void;
  title?: string | null;
  icon?: ReactNode;
  align?: "start" | "center" | "end";
}

export function FilterChipMultiSelect<TValue extends string>({
  label,
  options,
  value,
  onChange,
  title,
  icon,
  align,
}: FilterChipMultiSelectProps<TValue>) {
  const selected = options.filter((option) => value.includes(option.value));
  const [first] = selected;
  const valueLabel = !first
    ? null
    : selected.length === 1
      ? first.label
      : `${first.label} +${selected.length - 1}`;

  function toggle(optionValue: TValue): void {
    onChange(
      value.includes(optionValue)
        ? value.filter((current) => current !== optionValue)
        : [...value, optionValue],
    );
  }

  return (
    <FilterChip
      label={label}
      valueLabel={valueLabel}
      onClear={() => onChange([])}
      title={title}
      icon={icon}
      align={align}
    >
      <div className="flex flex-col">
        {options.map((option) => {
          const isChecked = value.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              role="checkbox"
              aria-checked={isChecked}
              onClick={() => toggle(option.value)}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-small text-neutral-800 hover:bg-neutral-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                  isChecked
                    ? "border-primary-500 bg-primary-500 text-white"
                    : "border-neutral-300 bg-white",
                )}
              >
                {isChecked && <Check className="size-3" />}
              </span>
              <span className="flex-1">{option.label}</span>
            </button>
          );
        })}
      </div>
    </FilterChip>
  );
}

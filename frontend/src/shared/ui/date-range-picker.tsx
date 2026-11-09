import * as React from "react";
import { CalendarRange } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/shared/ui/button";
import { Calendar } from "@/shared/ui/calendar";
import { FilterChip } from "@/shared/ui/filter-chip";
import { Separator } from "@/shared/ui/separator";

interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  label?: string;
}

/** Sem `new Date(iso)`, que lê a data como UTC. */
function parseIsoDate(value: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date | undefined): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatIsoDateLabel(value: string): string {
  return value.split("-").reverse().join("/");
}

function formatRangeLabel(from: string, to: string): string {
  const [fromLabel, toLabel] = [from, to].map((value) =>
    value ? formatIsoDateLabel(value) : "...",
  );
  return `${fromLabel} - ${toLabel}`;
}

export function DateRangePicker({
  from,
  to,
  onChange,
  label = "Período",
}: DateRangePickerProps) {
  const selected: DateRange | undefined = React.useMemo(() => {
    const fromDate = parseIsoDate(from);
    const toDate = parseIsoDate(to);
    if (!fromDate && !toDate) return undefined;
    return { from: fromDate ?? toDate, to: toDate };
  }, [from, to]);

  const hasRange = Boolean(from || to);

  return (
    <FilterChip
      label={label}
      valueLabel={hasRange ? formatRangeLabel(from, to) : null}
      showValue
      onClear={() => onChange({ from: "", to: "" })}
      align="end"
      title={null}
      icon={<CalendarRange className="size-4" aria-hidden="true" />}
      contentClassName="w-auto p-0"
    >
      <div className="flex items-center justify-between gap-4 px-3 pt-3">
        <span className="text-caption uppercase tracking-wide text-neutral-500">
          {label}
        </span>
        <span className="text-sm font-medium tabular-nums">
          {hasRange ? formatRangeLabel(from, to) : "Nenhuma data"}
        </span>
      </div>
      <Calendar
        mode="range"
        numberOfMonths={2}
        selected={selected}
        defaultMonth={parseIsoDate(from) ?? parseIsoDate(to)}
        onSelect={(range) =>
          onChange({ from: toIsoDate(range?.from), to: toIsoDate(range?.to) })
        }
      />
      <Separator />
      <div className="flex items-center justify-end gap-2 p-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasRange}
          onClick={() => onChange({ from: "", to: "" })}
        >
          Limpar período
        </Button>
      </div>
    </FilterChip>
  );
}

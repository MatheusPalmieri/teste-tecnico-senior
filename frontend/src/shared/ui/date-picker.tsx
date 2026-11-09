import * as React from "react";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Calendar } from "@/shared/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { cn } from "@/shared/lib/cn";

interface DatePickerProps extends Omit<
  React.ComponentPropsWithoutRef<"button">,
  "value" | "onChange" | "type"
> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
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

export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  (
    {
      value,
      onChange,
      placeholder = "Selecione uma data",
      minDate,
      maxDate,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);

    const minDay = parseIsoDate(minDate ?? "");
    const maxDay = parseIsoDate(maxDate ?? "");
    const disabledDays = [
      ...(minDay ? [{ before: minDay }] : []),
      ...(maxDay ? [{ after: maxDay }] : []),
    ];

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            type="button"
            variant="secondary"
            disabled={disabled}
            data-empty={!value}
            className={cn(
              "w-full justify-start text-left font-normal data-[empty=true]:text-muted-foreground",
              className,
            )}
            {...props}
          >
            <CalendarIcon className="h-4 w-4" />
            {value ? formatIsoDateLabel(value) : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={parseIsoDate(value)}
            defaultMonth={parseIsoDate(value) ?? minDay}
            startMonth={minDay}
            endMonth={maxDay}
            disabled={disabledDays.length > 0 ? disabledDays : undefined}
            onSelect={(date) => {
              if (!date) return;
              onChange(toIsoDate(date));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    );
  },
);
DatePicker.displayName = "DatePicker";

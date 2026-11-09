import { formatMoney } from "@/shared/lib/money";
import { cn } from "@/shared/lib/cn";

interface MoneyProps {
  value: string;
  className?: string;
}

export function Money({ value, className }: MoneyProps) {
  return <span className={cn("tabular-nums", className)}>{formatMoney(value)}</span>;
}

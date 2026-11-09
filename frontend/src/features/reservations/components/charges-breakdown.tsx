import { Money } from "@/shared/ui/money";

import type { Breakdown } from "../api/types";

const DAY_TYPE_LABEL: Record<string, string> = {
  WEEKDAY: "Dia útil",
  WEEKEND: "Fim de semana",
};

interface ChargesBreakdownProps {
  breakdown: Breakdown;
}

export function ChargesBreakdown({ breakdown }: ChargesBreakdownProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
      <ul className="flex flex-col gap-2">
        {breakdown.lines.map((line, index) => (
          <li
            key={`${line.kind}-${line.day_type}-${index}`}
            className="flex items-center justify-between text-body"
          >
            <span className="text-neutral-700">
              {line.description}
              {line.day_type && (
                <span className="ml-1 text-small text-neutral-500">
                  ({line.quantity}x {DAY_TYPE_LABEL[line.day_type] ?? line.day_type})
                </span>
              )}
            </span>
            <Money value={line.amount} className="text-body-strong" />
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-1 border-t border-neutral-200 pt-3 text-small text-neutral-600">
        <div className="flex items-center justify-between">
          <span>Subtotal de diárias</span>
          <Money value={breakdown.nightly_subtotal} />
        </div>
        {Number(breakdown.parking_subtotal) > 0 && (
          <div className="flex items-center justify-between">
            <span>Subtotal de vaga</span>
            <Money value={breakdown.parking_subtotal} />
          </div>
        )}
        {Number(breakdown.late_check_out_fee) > 0 && (
          <div className="flex items-center justify-between">
            <span>Multa de late check-out</span>
            <Money value={breakdown.late_check_out_fee} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between rounded-lg border border-primary-100 bg-primary-50 px-4 py-3">
        <span className="text-h3 text-neutral-900">Total geral</span>
        <Money value={breakdown.total} className="text-h1 text-neutral-900" />
      </div>
    </div>
  );
}

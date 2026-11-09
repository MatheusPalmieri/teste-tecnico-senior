import { Callout } from "@/shared/ui/callout";

import type { CheckOutPreview } from "../api/types";

interface LateCheckOutAlertProps {
  preview: CheckOutPreview;
}

export function LateCheckOutAlert({ preview }: LateCheckOutAlertProps) {
  if (!preview.is_late_check_out) return null;

  return (
    <Callout title={`Check-out após as ${preview.check_out_deadline}`}>
      Horário atual: {preview.current_time}. Será cobrada taxa de late check-out de 50% da
      diária (R$ {preview.late_check_out_fee}).
    </Callout>
  );
}

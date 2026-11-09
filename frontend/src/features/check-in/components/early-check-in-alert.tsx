import { Callout } from "@/shared/ui/callout";

interface EarlyCheckInAlertProps {
  currentTime: string;
  serverMessage?: string;
}

export function EarlyCheckInAlert({
  currentTime,
  serverMessage,
}: EarlyCheckInAlertProps) {
  return (
    <Callout title="Check-in previsto a partir das 14h00">
      {serverMessage ?? `Horário atual: ${currentTime}.`}
    </Callout>
  );
}

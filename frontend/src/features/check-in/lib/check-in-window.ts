const TIME_ZONE = "America/Sao_Paulo";
const CHECK_IN_FROM_HOUR = 14;

export function isCheckInAllowed(moment: Date): boolean {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(moment);
  return Number(hour) >= CHECK_IN_FROM_HOUR;
}

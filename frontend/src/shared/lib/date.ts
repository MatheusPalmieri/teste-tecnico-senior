/** Data "yyyy-mm-dd" não passa por `new Date()`: viraria meia-noite UTC, um dia antes em São Paulo. */

const TIME_ZONE = "America/Sao_Paulo";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function resolve(value: string): { date: Date; timeZone: string } {
  if (DATE_ONLY.test(value)) {
    const [year, month, day] = value.split("-").map(Number) as [number, number, number];
    return { date: new Date(Date.UTC(year, month - 1, day)), timeZone: "UTC" };
  }
  return { date: new Date(value), timeZone: TIME_ZONE };
}

function format(value: string, options: Intl.DateTimeFormatOptions): string {
  const { date, timeZone } = resolve(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { timeZone, ...options }).format(date);
}

export function greetingForNow(): "Bom dia" | "Boa tarde" | "Boa noite" {
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: TIME_ZONE,
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function formatDate(value: string): string {
  return format(value, { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(value: string): string {
  return format(value, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatLongDate(value: string): string {
  const formatted = format(value, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatTime(value: string): string {
  return format(value, { hour: "2-digit", minute: "2-digit" });
}

export function todayIsoDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

export function addDaysToIsoDate(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "";
  const date = new Date(year, month - 1, day + days);
  const pad = (part: number): string => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Conta em UTC: no fuso local, a virada do horário de verão erraria uma noite. */
export function nightsBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

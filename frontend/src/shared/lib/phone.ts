export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatPhone(value: string): string {
  const digits = normalizePhone(value).slice(0, 11);

  if (digits.length <= 2) {
    return digits.replace(/^(\d*)/, "($1");
  }
  if (digits.length <= 6) {
    return digits.replace(/^(\d{2})(\d*)/, "($1) $2");
  }
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d*)/, "($1) $2-$3");
  }
  return digits.replace(/^(\d{2})(\d{5})(\d*)/, "($1) $2-$3");
}

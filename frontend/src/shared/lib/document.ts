export function normalizeDocument(value: string): string {
  return value.toUpperCase().replace(/[^0-9X]/g, "");
}

export function formatDocument(value: string, type: "CPF" | "RG"): string {
  const digits = normalizeDocument(value);

  if (type === "CPF" && digits.length === 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }
  if (type === "RG" && digits.length === 9) {
    return digits.replace(/^(\d{2})(\d{3})(\d{3})([\dX])$/, "$1.$2.$3-$4");
  }
  return value;
}

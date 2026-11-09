import { describe, expect, it } from "vitest";

import { formatPhone, normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it("mantém só os dígitos", () => {
    expect(normalizePhone("(11) 91234-5678")).toBe("11912345678");
    expect(normalizePhone("+55 11 3456 7890")).toBe("551134567890");
    expect(normalizePhone("abc")).toBe("");
  });
});

describe("formatPhone", () => {
  it("aplica a máscara progressivamente conforme o usuário digita", () => {
    expect(formatPhone("")).toBe("(");
    expect(formatPhone("1")).toBe("(1");
    expect(formatPhone("11")).toBe("(11");
    expect(formatPhone("119")).toBe("(11) 9");
    expect(formatPhone("119123")).toBe("(11) 9123");
  });

  it("usa 4 dígitos no prefixo para telefone fixo (10 dígitos)", () => {
    expect(formatPhone("1134567")).toBe("(11) 3456-7");
    expect(formatPhone("1134567890")).toBe("(11) 3456-7890");
  });

  it("usa 5 dígitos no prefixo para celular (11 dígitos)", () => {
    expect(formatPhone("11912345678")).toBe("(11) 91234-5678");
  });

  it("descarta dígitos além do 11o", () => {
    expect(formatPhone("119123456789999")).toBe("(11) 91234-5678");
  });

  it("aceita entrada já mascarada sem duplicar a máscara", () => {
    expect(formatPhone("(11) 91234-5678")).toBe("(11) 91234-5678");
  });
});

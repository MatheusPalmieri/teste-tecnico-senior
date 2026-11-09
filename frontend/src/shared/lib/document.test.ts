import { describe, expect, it } from "vitest";

import { formatDocument, normalizeDocument } from "./document";

describe("normalizeDocument", () => {
  it("mantém só dígitos, preservando zero a esquerda", () => {
    expect(normalizeDocument("04.471.290-8")).toBe("044712908");
  });

  it("preserva o X final do RG, em maiuscula", () => {
    expect(normalizeDocument("12.345.678-x")).toBe("12345678X");
  });
});

describe("formatDocument", () => {
  it("máscara CPF de 11 dígitos", () => {
    expect(formatDocument("47211893036", "CPF")).toBe("472.118.930-36");
  });

  it("máscara RG de 9 dígitos preservando zero a esquerda", () => {
    expect(formatDocument("044712908", "RG")).toBe("04.471.290-8");
  });

  it("máscara RG terminado em X", () => {
    expect(formatDocument("12345678X", "RG")).toBe("12.345.678-X");
  });

  it("devolve o valor original quando o tamanho foge do padrão", () => {
    expect(formatDocument("12345", "CPF")).toBe("12345");
    expect(formatDocument("1234567", "RG")).toBe("1234567");
  });

  it("não aplica máscara de CPF em documento marcado como RG", () => {
    expect(formatDocument("47211893036", "RG")).toBe("47211893036");
  });
});

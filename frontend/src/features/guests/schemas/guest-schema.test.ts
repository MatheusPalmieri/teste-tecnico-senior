import { describe, expect, it } from "vitest";

import { guestSchema } from "./guest-schema";

const VALID_CPF = "11144477735";

describe("guestSchema", () => {
  it("aceita um CPF válido", () => {
    const result = guestSchema.safeParse({
      name: "Ana Paula",
      document: "111.444.777-35",
      phone: "(11) 98888-7777",
    });
    expect(result.success).toBe(true);
  });

  it("recusa CPF inválido (dígito verificador errado)", () => {
    const result = guestSchema.safeParse({
      name: "Ana Paula",
      document: "111.444.777-36",
      phone: "(11) 98888-7777",
    });
    expect(result.success).toBe(false);
  });

  it("aceita como RG qualquer documento que não tenha 11 dígitos (RG não tem dígito nacional)", () => {
    const result = guestSchema.safeParse({
      name: "Ana Paula",
      document: "12.345.678-9",
      phone: "(11) 98888-7777",
    });
    expect(result.success).toBe(true);
  });

  it("normaliza documento e telefone para só dígitos no envio", () => {
    const result = guestSchema.parse({
      name: "Ana Paula",
      document: VALID_CPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4"),
      phone: "(11) 98888-7777",
    });
    expect(result.document).toBe(VALID_CPF);
    expect(result.phone).toBe("11988887777");
  });

  it("exige nome com ao menos 3 caracteres", () => {
    const result = guestSchema.safeParse({
      name: "Jo",
      document: VALID_CPF,
      phone: "11988887777",
    });
    expect(result.success).toBe(false);
  });

  it("exige telefone válido com ao menos 10 dígitos", () => {
    const result = guestSchema.safeParse({
      name: "Ana Paula",
      document: VALID_CPF,
      phone: "123",
    });
    expect(result.success).toBe(false);
  });

  it.each(["ABC", "12a45678", "X1234567", "1234"])(
    "recusa o documento %s",
    (document) => {
      const result = guestSchema.safeParse({
        name: "Ana Paula",
        document,
        phone: "11988887777",
      });
      expect(result.success).toBe(false);
    },
  );

  it("mantém o dígito X do RG", () => {
    const result = guestSchema.parse({
      name: "Ana Paula",
      document: "12.345.678-x",
      phone: "11988887777",
    });
    expect(result.document).toBe("12345678X");
  });

  it.each(["abc", "11 98888-7777 ramal 2", "11988887777123"])(
    "rejects the phone %s",
    (phone) => {
      const result = guestSchema.safeParse({
        name: "Ana Paula",
        document: VALID_CPF,
        phone,
      });
      expect(result.success).toBe(false);
    },
  );

  it("aceita telefone com o código do país", () => {
    const result = guestSchema.parse({
      name: "Ana Paula",
      document: VALID_CPF,
      phone: "+55 (11) 98888-7777",
    });
    expect(result.phone).toBe("5511988887777");
  });
});

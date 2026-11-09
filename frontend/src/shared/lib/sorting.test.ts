import { describe, expect, it } from "vitest";

import { sortFilterSchema, toOrderingParam } from "./sorting";
import { z } from "zod";

describe("toOrderingParam", () => {
  it("prefixa o campo com '-' quando a ordem é descendente", () => {
    expect(toOrderingParam("name", "asc")).toBe("name");
    expect(toOrderingParam("name", "desc")).toBe("-name");
  });

  it("traduz o id da coluna para o campo do backend", () => {
    const map = { guest: "guest__name" };
    expect(toOrderingParam("guest", "asc", map)).toBe("guest__name");
    expect(toOrderingParam("guest", "desc", map)).toBe("-guest__name");
  });
});

describe("sortFilterSchema", () => {
  const schema = z.object(sortFilterSchema(["name", "phone"], "name"));

  it("aceita campo e direção válidos vindos da URL", () => {
    expect(schema.parse({ sort: "phone", order: "desc" })).toEqual({
      sort: "phone",
      order: "desc",
    });
  });

  it("cai no default quando a URL traz valores fora da lista", () => {
    expect(schema.parse({ sort: "senha", order: "up" })).toEqual({
      sort: "name",
      order: "asc",
    });
  });
});

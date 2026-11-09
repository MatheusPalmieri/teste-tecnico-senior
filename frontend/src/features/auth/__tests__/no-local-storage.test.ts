import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    return statSync(fullPath).isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

describe("Sessão nunca toca localStorage/sessionStorage", () => {
  it("nenhum arquivo da feature auth lê ou grava em localStorage/sessionStorage", () => {
    const authDir = join(__dirname, "..");
    const offenders = listFiles(authDir)
      .filter((file) => /\.(ts|tsx)$/.test(file) && !file.includes("__tests__"))
      .filter((file) => /localStorage|sessionStorage/.test(readFileSync(file, "utf-8")));

    expect(offenders).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";

import { getAvailableActions } from "./reservation-actions";

describe("getAvailableActions", () => {
  it("RESERVED permite ver, editar, check-in e cancelar", () => {
    expect(getAvailableActions("RESERVED")).toEqual([
      "view",
      "edit",
      "check-in",
      "cancel",
    ]);
  });

  it("CHECKED_IN permite só ver e check-out", () => {
    expect(getAvailableActions("CHECKED_IN")).toEqual(["view", "check-out"]);
  });

  it("CHECKED_OUT permite só ver", () => {
    expect(getAvailableActions("CHECKED_OUT")).toEqual(["view"]);
  });

  it("CANCELLED permite só ver", () => {
    expect(getAvailableActions("CANCELLED")).toEqual(["view"]);
  });
});

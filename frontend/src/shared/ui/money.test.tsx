import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Money } from "./money";

describe("Money", () => {
  it("formata e aplica tabular-nums", () => {
    render(<Money value="1234.50" />);
    const el = screen.getByText("R$ 1.234,50");
    expect(el).toHaveClass("tabular-nums");
  });
});

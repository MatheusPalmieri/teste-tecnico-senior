import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Separator } from "./separator";

describe("Separator", () => {
  it("e horizontal por padrão e decorativo (sem role)", () => {
    const { container } = render(<Separator />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("w-full");
    expect(el).toHaveAttribute("role", "none");
  });

  it("aceita orientação vertical", () => {
    const { container } = render(<Separator orientation="vertical" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("h-full");
  });

  it("quando não-decorativo, expõe role separator", () => {
    const { getByRole } = render(<Separator decorative={false} />);
    expect(getByRole("separator")).toBeInTheDocument();
  });
});

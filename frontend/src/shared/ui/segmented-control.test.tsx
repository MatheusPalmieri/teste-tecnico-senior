import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SegmentedControl } from "./segmented-control";

const OPTIONS = [
  { value: "open" as const, label: "Em aberto" },
  { value: "history" as const, label: "Histórico" },
];

describe("SegmentedControl", () => {
  it("expõe um grupo rotulado e marca a opção ativa com aria-pressed (não role=tab)", () => {
    render(
      <SegmentedControl
        label="Alternar visão"
        value="open"
        onValueChange={vi.fn()}
        options={OPTIONS}
      />,
    );

    expect(screen.getByRole("group", { name: "Alternar visão" })).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Em aberto", pressed: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Histórico", pressed: false }),
    ).toBeInTheDocument();
  });

  it("avisa o chamador ao clicar numa opção", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <SegmentedControl
        label="Alternar visão"
        value="open"
        onValueChange={onValueChange}
        options={OPTIONS}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Histórico" }));

    expect(onValueChange).toHaveBeenCalledWith("history");
  });
});

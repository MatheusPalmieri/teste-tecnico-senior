import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it.each([
    ["RESERVED", "Reservada"],
    ["CHECKED_IN", "Hospedado"],
    ["CHECKED_OUT", "Finalizada"],
    ["CANCELLED", "Cancelada"],
  ] as const)("renderiza o rótulo correto para %s", (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

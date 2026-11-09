import { describe, expect, it } from "vitest";

import { render, screen } from "@/test/utils";

import { GuestStatusBadge } from "./guest-status-badge";

describe("GuestStatusBadge", () => {
  it("mostra 'No hotel' para CHECKED_IN", () => {
    render(<GuestStatusBadge status="CHECKED_IN" />);
    expect(screen.getByText("No hotel")).toBeInTheDocument();
  });

  it("mostra 'Aguardando check-in' para RESERVED", () => {
    render(<GuestStatusBadge status="RESERVED" />);
    expect(screen.getByText("Aguardando check-in")).toBeInTheDocument();
  });

  it("mostra 'Sem reserva ativa' quando não há reserva ativa", () => {
    render(<GuestStatusBadge status={null} />);
    expect(screen.getByText("Sem reserva ativa")).toBeInTheDocument();
  });
});

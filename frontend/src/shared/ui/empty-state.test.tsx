import { render, screen } from "@testing-library/react";
import { Inbox } from "lucide-react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("renderiza título, descrição e ação (nunca tela em branco)", () => {
    render(
      <EmptyState
        icon={Inbox}
        title="Nenhum hóspede encontrado"
        description="Ajuste os filtros ou cadastre um novo hóspede."
        action={<button>Cadastrar hóspede</button>}
      />,
    );

    expect(screen.getByText("Nenhum hóspede encontrado")).toBeInTheDocument();
    expect(screen.getByText(/Ajuste os filtros/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cadastrar hóspede" })).toBeInTheDocument();
  });

  it("descrição e ação são opcionais", () => {
    render(<EmptyState icon={Inbox} title="Sem dados" />);
    expect(screen.getByText("Sem dados")).toBeInTheDocument();
  });
});

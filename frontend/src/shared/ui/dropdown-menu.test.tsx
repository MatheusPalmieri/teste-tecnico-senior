import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";

function openMenu(): void {
  fireEvent.keyDown(screen.getByRole("button", { name: "Ações" }), { key: "Enter" });
}

function renderMenu(onSelect = vi.fn(), onCheckedChange = vi.fn()) {
  render(
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Ações">⋯</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Reserva</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={onSelect}>
            Editar
            <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem disabled>Fazer check-in</DropdownMenuItem>
          <DropdownMenuItem destructive>Cancelar reserva</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked onCheckedChange={onCheckedChange}>
          Mostrar canceladas
        </DropdownMenuCheckboxItem>
        <DropdownMenuRadioGroup value="asc">
          <DropdownMenuRadioItem value="asc">Crescente</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="desc">Decrescente</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Exportar</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>CSV</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>,
  );
  return { onSelect, onCheckedChange };
}

describe("DropdownMenu", () => {
  it("fechado, nenhum item fica no documento", () => {
    renderMenu();

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.queryByText("Editar")).not.toBeInTheDocument();
  });

  it("aberto, mostra rótulo, itens, separador e submenu", () => {
    renderMenu();

    openMenu();

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("Reserva")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Editar/ })).toBeInTheDocument();
    expect(screen.getByRole("separator")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Exportar" })).toBeInTheDocument();
  });

  it("escolher um item dispara a ação da linha", () => {
    const { onSelect } = renderMenu();

    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: /Editar/ }));

    expect(onSelect).toHaveBeenCalled();
  });

  it("item desabilitado não aceita interação", () => {
    renderMenu();

    openMenu();

    expect(screen.getByRole("menuitem", { name: "Fazer check-in" })).toHaveAttribute(
      "data-disabled",
    );
  });

  it("item destrutivo recebe o tom de perigo", () => {
    renderMenu();

    openMenu();

    expect(
      screen.getByRole("menuitem", { name: "Cancelar reserva" }).className,
    ).toContain("text-destructive");
  });

  it("checkbox e radio expõem o estado marcado para o leitor de tela", () => {
    renderMenu();

    openMenu();

    expect(screen.getByRole("menuitemcheckbox")).toHaveAttribute("aria-checked", "true");
    const [ascending, descending] = screen.getAllByRole("menuitemradio");
    expect(ascending).toHaveAttribute("aria-checked", "true");
    expect(descending).toHaveAttribute("aria-checked", "false");
  });

  it("desmarcar o checkbox avisa o chamador", () => {
    const { onCheckedChange } = renderMenu();

    openMenu();
    fireEvent.click(screen.getByRole("menuitemcheckbox"));

    expect(onCheckedChange).toHaveBeenCalledWith(false);
  });

  it("o atalho aparece junto do item", () => {
    renderMenu();

    openMenu();

    expect(screen.getByText("⌘E")).toBeInTheDocument();
  });

  it("`Escape` fecha o menu", () => {
    renderMenu();

    openMenu();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});

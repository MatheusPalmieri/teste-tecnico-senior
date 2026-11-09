import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

function renderSheet(onOpenChange = vi.fn()) {
  render(
    <Sheet onOpenChange={onOpenChange}>
      <SheetTrigger>Abrir menu</SheetTrigger>
      <SheetContent>
        <SheetTitle>Navegação</SheetTitle>
        <SheetDescription>Menu lateral do sistema.</SheetDescription>
        <SheetClose>Ir para o dashboard</SheetClose>
      </SheetContent>
    </Sheet>,
  );
  return onOpenChange;
}

describe("Sheet", () => {
  it("fechado, o conteúdo não esta no documento", () => {
    renderSheet();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("aberto, mostra título, descrição e o botão de fechar rotulado", () => {
    renderSheet();

    fireEvent.click(screen.getByText("Abrir menu"));

    const sheet = screen.getByRole("dialog");
    expect(sheet).toHaveAccessibleName("Navegação");
    expect(sheet).toHaveAccessibleDescription("Menu lateral do sistema.");
    expect(screen.getByText("Fechar menu")).toBeInTheDocument();
  });

  it("o X fecha o drawer", () => {
    const onOpenChange = renderSheet();

    fireEvent.click(screen.getByText("Abrir menu"));
    fireEvent.click(screen.getByText("Fechar menu"));

    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("um item interno com `SheetClose` também fecha — navegar não deixa o menu aberto", () => {
    const onOpenChange = renderSheet();

    fireEvent.click(screen.getByText("Abrir menu"));
    fireEvent.click(screen.getByText("Ir para o dashboard"));

    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("`Escape` fecha o drawer", () => {
    const onOpenChange = renderSheet();

    fireEvent.click(screen.getByText("Abrir menu"));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});

import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { render, screen, waitFor } from "@/test/utils";

import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

function Fixture() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Abrir</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar</DialogTitle>
          <DialogDescription>Conteudo do dialog.</DialogDescription>
        </DialogHeader>
        <Button>Acao</Button>
      </DialogContent>
    </Dialog>
  );
}

describe("Dialog", () => {
  it("abre pelo teclado e fecha com Escape, devolvendo o foco ao gatilho", async () => {
    const user = userEvent.setup();
    render(<Fixture />);

    const trigger = screen.getByRole("button", { name: "Abrir" });
    trigger.focus();
    await user.keyboard("{Enter}");

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAccessibleName("Confirmar");

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("mantém o foco preso no conteúdo enquanto esta aberto", async () => {
    const user = userEvent.setup();
    render(<Fixture />);

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    const dialog = await screen.findByRole("dialog");

    await user.tab();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });
});

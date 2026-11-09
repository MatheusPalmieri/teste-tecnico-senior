import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

function selectTab(name: string): void {
  fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0, ctrlKey: false });
}

function renderTabs(onValueChange = vi.fn()) {
  render(
    <Tabs defaultValue="open" onValueChange={onValueChange}>
      <TabsList>
        <TabsTrigger value="open">Em aberto</TabsTrigger>
        <TabsTrigger value="history">Histórico</TabsTrigger>
        <TabsTrigger value="archived" disabled>
          Arquivadas
        </TabsTrigger>
      </TabsList>
      <TabsContent value="open">Reservas do dia</TabsContent>
      <TabsContent value="history">Estadias encerradas</TabsContent>
    </Tabs>,
  );
  return onValueChange;
}

describe("Tabs", () => {
  it("mostra apenas o painel da aba ativa", () => {
    renderTabs();

    expect(screen.getByRole("tab", { name: "Em aberto", selected: true })).toBeVisible();
    expect(screen.getByText("Reservas do dia")).toBeInTheDocument();
    expect(screen.queryByText("Estadias encerradas")).not.toBeInTheDocument();
  });

  it("trocar de aba troca o painel e avisa o chamador", () => {
    const onValueChange = renderTabs();

    selectTab("Histórico");

    expect(onValueChange).toHaveBeenCalledWith("history");
    expect(screen.getByText("Estadias encerradas")).toBeInTheDocument();
    expect(screen.queryByText("Reservas do dia")).not.toBeInTheDocument();
  });

  it("aba desabilitada não muda a seleção", () => {
    const onValueChange = renderTabs();

    selectTab("Arquivadas");

    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole("tab", { name: "Em aberto", selected: true })).toBeVisible();
  });

  it("cada aba anuncia o painel que controla", () => {
    renderTabs();

    const panelId = screen
      .getByRole("tab", { name: "Em aberto" })
      .getAttribute("aria-controls");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("id", panelId);
  });
});

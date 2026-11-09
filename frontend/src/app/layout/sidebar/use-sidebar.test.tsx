import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useSidebar } from "./use-sidebar";

const STORAGE_KEY = "hotel:sidebar-collapsed";

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("useSidebar", () => {
  it("começa expandida quando não há preferência salva", () => {
    const { result } = renderHook(() => useSidebar());

    expect(result.current.collapsed).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("0");
  });

  it("o colapso persiste em `localStorage`", () => {
    const { result } = renderHook(() => useSidebar());

    act(() => result.current.toggle());

    expect(result.current.collapsed).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("1");
  });

  it("a preferência salva é lida na montagem seguinte", () => {
    window.localStorage.setItem(STORAGE_KEY, "1");

    const { result } = renderHook(() => useSidebar());

    expect(result.current.collapsed).toBe(true);
  });

  it("a tecla `[` alterna a sidebar", () => {
    const { result } = renderHook(() => useSidebar());

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "[" }));
    });
    expect(result.current.collapsed).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "[" }));
    });
    expect(result.current.collapsed).toBe(false);
  });

  it.each(["INPUT", "TEXTAREA"])(
    "`[` digitado dentro de um %s não alterna a sidebar",
    (tag) => {
      const { result } = renderHook(() => useSidebar());
      const field = document.createElement(tag);
      document.body.appendChild(field);

      act(() => {
        field.dispatchEvent(new KeyboardEvent("keydown", { key: "[", bubbles: true }));
      });

      expect(result.current.collapsed).toBe(false);
      field.remove();
    },
  );

  it("outra tecla não altera o estado", () => {
    const { result } = renderHook(() => useSidebar());

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "]" }));
    });

    expect(result.current.collapsed).toBe(false);
  });

  it("para de escutar o teclado ao desmontar", () => {
    const removeEventListener = vi.spyOn(window, "removeEventListener");

    renderHook(() => useSidebar()).unmount();

    expect(removeEventListener).toHaveBeenCalledWith("keydown", expect.any(Function));
  });

  it("degrada sem quebrar quando `localStorage` esta indisponível", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("acesso negado");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("acesso negado");
    });

    const { result } = renderHook(() => useSidebar());
    expect(result.current.collapsed).toBe(false);

    act(() => result.current.toggle());
    expect(result.current.collapsed).toBe(true);
  });
});

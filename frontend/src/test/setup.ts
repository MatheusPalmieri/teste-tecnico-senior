import "@testing-library/jest-dom/vitest";

import { fetch, FormData, Headers, Request, Response } from "undici";
import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "./msw/server";

globalThis.fetch = fetch as unknown as typeof globalThis.fetch;
globalThis.Request = Request as unknown as typeof globalThis.Request;
globalThis.Response = Response as unknown as typeof globalThis.Response;
globalThis.Headers = Headers as unknown as typeof globalThis.Headers;
globalThis.FormData = FormData as unknown as typeof globalThis.FormData;

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver ??= ResizeObserverStub;

Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.setPointerCapture ??= () => {};
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollIntoView ??= () => {};

function clearAllCookies(): void {
  document.cookie.split(";").forEach((cookie) => {
    const name = cookie.split("=")[0]?.trim();
    if (name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  });
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  clearAllCookies();
  window.localStorage.clear();
});
afterAll(() => server.close());

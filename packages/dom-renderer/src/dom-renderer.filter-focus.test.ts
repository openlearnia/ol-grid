/** @vitest-environment happy-dom */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createGridEngine } from "@ol-grid/core";
import { FilterModule } from "@ol-grid/filter";
import { createDomRenderer } from "./dom-renderer.js";

interface Person {
  id: number;
  name: string;
  role: string;
}

function createFilterGrid(host: HTMLElement) {
  const engine = createGridEngine<Person>({
    modules: [FilterModule],
    getRowId: ({ data }) => String(data.id),
    columnDefs: [
      { field: "id", headerName: "ID", width: 72 },
      {
        field: "name",
        headerName: "Name",
        width: 140,
        filter: "text",
        floatingFilter: true,
      },
      { field: "role", headerName: "Role", width: 120, filter: "text" },
    ],
    rowData: [
      { id: 1, name: "Alice", role: "Engineer" },
      { id: 2, name: "Bob", role: "Designer" },
    ],
  });

  const renderer = createDomRenderer();
  engine.mount(host, renderer);
  engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });
  return engine;
}

describe("DomRenderer floating filter focus", () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement("div");
    host.style.width = "800px";
    host.style.height = "400px";
    document.body.appendChild(host);

    globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    };
    globalThis.cancelAnimationFrame = () => {};
    globalThis.ResizeObserver = class {
      observe() {}
      disconnect() {}
      unobserve() {}
    };
  });

  afterEach(() => {
    host.remove();
  });

  async function flushMicrotasks(): Promise<void> {
    await Promise.resolve();
  }

  function getFloatingFilterInput(): HTMLInputElement {
    const input = host.querySelector<HTMLInputElement>("[data-floating-filter-input]");
    expect(input).not.toBeNull();
    return input!;
  }

  it("click on floating filter keeps input focused (header handler does not steal focus)", async () => {
    createFilterGrid(host);
    await flushMicrotasks();

    const input = getFloatingFilterInput();
    input.focus();
    expect(document.activeElement).toBe(input);

    input.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flushMicrotasks();

    expect(document.activeElement).toBe(input);
    expect(host.querySelector(".ol-grid__header-cell--focused")).toBeNull();
  });

  it("does not steal focus from floating filter input after filter apply re-render", async () => {
    const engine = createFilterGrid(host);
    await flushMicrotasks();

    const input = getFloatingFilterInput();
    input.focus();
    input.value = "Ali";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 450));
    await flushMicrotasks();

    expect(document.activeElement).toBe(input);
    expect(engine.getApi().getDisplayedRowCount()).toBe(1);
  });

  it("allows typing in floating filter without grid keyboard interception", async () => {
    createFilterGrid(host);
    await flushMicrotasks();

    const input = getFloatingFilterInput();
    input.focus();

    const event = new KeyboardEvent("keydown", {
      key: "a",
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it("Tab into grid lands on first floating filter input", async () => {
    createFilterGrid(host);
    await flushMicrotasks();

    host.focus();
    await flushMicrotasks();

    const input = getFloatingFilterInput();
    expect(document.activeElement).toBe(input);
  });

  it("Tab from last floating filter focuses first header", async () => {
    createFilterGrid(host);
    await flushMicrotasks();

    const input = getFloatingFilterInput();
    input.focus();
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }),
    );
    await flushMicrotasks();

    const focusedHeader = host.querySelector<HTMLElement>(".ol-grid__header-cell--focused");
    expect(focusedHeader).not.toBeNull();
    expect(focusedHeader?.dataset.colId).toBe("id");
    expect(document.activeElement).toBe(focusedHeader);
  });

  it("Shift+Tab from first header focuses floating filter input", async () => {
    const engine = createFilterGrid(host);
    await flushMicrotasks();

    engine.setFocusedHeader("id");
    await flushMicrotasks();

    const focusedHeader = host.querySelector<HTMLElement>(".ol-grid__header-cell--focused");
    expect(focusedHeader).not.toBeNull();
    focusedHeader!.focus();

    focusedHeader!.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    await flushMicrotasks();

    const input = getFloatingFilterInput();
    expect(document.activeElement).toBe(input);
  });
});

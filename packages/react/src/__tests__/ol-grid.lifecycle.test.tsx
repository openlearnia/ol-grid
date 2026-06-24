/** @vitest-environment happy-dom */
import { act, StrictMode, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { OlGrid } from "../ol-grid.js";

const GRID_PROPS = {
  columnDefs: [{ field: "name", headerName: "Name", width: 160 }],
  rowData: [{ name: "Alice" }, { name: "Bob" }],
  style: { width: 640, height: 320 },
} as const;

function installDomMocks(): void {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  };
  globalThis.cancelAnimationFrame = () => {};
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
  } as typeof ResizeObserver;
}

function renderGrid(strict: boolean): { host: HTMLDivElement; root: Root } {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  const grid = createElement(OlGrid, GRID_PROPS);

  act(() => {
    root.render(strict ? createElement(StrictMode, null, grid) : grid);
  });

  return { host, root };
}

describe("OlGrid lifecycle", () => {
  beforeEach(() => {
    installDomMocks();
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("mounts under React StrictMode without throwing", () => {
    const { host, root } = renderGrid(true);

    expect(host.querySelector(".ol-grid-host")).not.toBeNull();
    expect(host.querySelector(".ol-grid__header-cell")?.textContent).toBe("Name");

    act(() => root.unmount());
  });

  it("survives unmount and remount", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    act(() => {
      root.render(createElement(OlGrid, GRID_PROPS));
    });
    expect(host.querySelector(".ol-grid-host")).not.toBeNull();

    act(() => root.unmount());
    expect(host.querySelector(".ol-grid__header-cell")).toBeNull();

    const remountRoot = createRoot(host);
    act(() => {
      remountRoot.render(createElement(OlGrid, GRID_PROPS));
    });
    expect(host.querySelector(".ol-grid__header-cell")?.textContent).toBe("Name");

    act(() => remountRoot.unmount());
  });

  it("destroys the engine after final unmount", async () => {
    const { host, root } = renderGrid(false);

    expect(host.querySelector(".ol-grid-host")).not.toBeNull();

    act(() => root.unmount());

    await act(async () => {
      await Promise.resolve();
    });

    expect(host.querySelector(".ol-grid__header-cell")).toBeNull();
  });
});

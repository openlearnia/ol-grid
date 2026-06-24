/** @vitest-environment happy-dom */
import { beforeEach, describe, expect, it } from "vitest";
import { ModuleRegistry } from "@ol-grid/core";
import { createDomRenderer } from "@ol-grid/dom-renderer";
import { FilterModule } from "@ol-grid/filter";
import { SortModule } from "@ol-grid/sort";
import { createAdapterEngine } from "../engine-setup.js";

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

describe("createAdapterEngine (Svelte)", () => {
  beforeEach(() => {
    ModuleRegistry.clear();
    ModuleRegistry.register(SortModule);
    ModuleRegistry.register(FilterModule);
    installDomMocks();
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("registers PaginationModule and slices rows by page", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);

    const engine = createAdapterEngine({
      columnDefs: [{ field: "name", headerName: "Name", width: 160 }],
      rowData: [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
        { id: 3, name: "Carol" },
        { id: 4, name: "Dave" },
      ],
      pagination: true,
      paginationPageSize: 2,
      getRowId: ({ data }) => String(data.id),
    });

    engine.mount(host, createDomRenderer());

    expect(ModuleRegistry.has("PaginationModule")).toBe(true);
    expect(host.querySelector(".ol-grid__pagination")).not.toBeNull();
    expect(host.textContent).toContain("Alice");
    expect(host.textContent).not.toContain("Carol");

    engine.getApi().paginationGoToNextPage();

    expect(host.textContent).toContain("Carol");
    expect(host.textContent).not.toContain("Alice");

    engine.destroy();
  });
});

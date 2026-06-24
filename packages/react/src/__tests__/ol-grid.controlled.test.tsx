/** @vitest-environment happy-dom */
import { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ModuleRegistry } from "@ol-grid/core";
import { SortModule } from "@ol-grid/sort";
import { PaginationModule } from "@ol-grid/pagination";
import { OlGrid } from "../ol-grid.js";

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

function ControlledSortDemo() {
  const [sortModel, setSortModel] = useState<Array<{ colId: string; sort: "asc" | "desc" }>>([]);

  return createElement(OlGrid, {
    columnDefs: [{ field: "name", headerName: "Name", width: 160 }],
    rowData: [{ name: "Bob" }, { name: "Alice" }],
    getRowId: ({ data }: { data: { name: string } }) => data.name,
    sortModel,
    onSortModelChange: setSortModel,
    style: { width: 640, height: 320 },
  });
}

describe("OlGrid controlled mode", () => {
  let root: Root | null = null;

  beforeEach(() => {
    ModuleRegistry.clear();
    ModuleRegistry.register(SortModule);
    ModuleRegistry.register(PaginationModule);
    installDomMocks();
  });

  afterEach(() => {
    act(() => root?.unmount());
    root = null;
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("syncs controlled sortModel when header is clicked", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    act(() => {
      root!.render(createElement(ControlledSortDemo));
    });

    const header = host.querySelector(".ol-grid__header-cell") as HTMLElement | null;
    expect(header).not.toBeNull();

    act(() => {
      header!.click();
    });

    const firstRow = host.querySelector(".ol-grid__cell")?.textContent;
    expect(firstRow).toBe("Alice");
  });

  it("syncs paginationPageSizeSelector prop changes", () => {
    const engineRef: { current: import("@ol-grid/core").GridEngine<{ name: string }> | null } = {
      current: null,
    };

    function PaginationSelectorDemo({ selector }: { selector: number[] }) {
      return createElement(OlGrid, {
        ref: (handle: import("../ol-grid.js").OlGridHandle<{ name: string }> | null) => {
          engineRef.current = handle?.grid ?? null;
        },
        columnDefs: [{ field: "name", headerName: "Name", width: 160 }],
        rowData: Array.from({ length: 30 }, (_, index) => ({ name: `Row ${index + 1}` })),
        getRowId: ({ data }: { data: { name: string } }) => data.name,
        pagination: true,
        paginationPageSize: 10,
        paginationPageSizeSelector: selector,
        style: { width: 640, height: 320 },
      });
    }

    const host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    act(() => {
      root!.render(createElement(PaginationSelectorDemo, { selector: [10, 20] }));
    });

    expect(engineRef.current?.getOptions().paginationPageSizeSelector).toEqual([10, 20]);
    expect(engineRef.current?.getPaginationController()?.getPageSizeSelector()).toEqual([10, 20]);

    act(() => {
      root!.render(createElement(PaginationSelectorDemo, { selector: [5, 10, 25] }));
    });

    expect(engineRef.current?.getOptions().paginationPageSizeSelector).toEqual([5, 10, 25]);
    expect(engineRef.current?.getPaginationController()?.getPageSizeSelector()).toEqual([5, 10, 25]);
  });
});

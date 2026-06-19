/** @vitest-environment happy-dom */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createGridEngine } from "@ol-grid/core";
import { createDomRenderer } from "./dom-renderer.js";

interface Person {
  id: number;
  name: string;
  role: string;
}

describe("DomRenderer header accessibility", () => {
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

  it("sets aria-sort on sortable headers", () => {
    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140 },
        { field: "role", headerName: "Role", width: 120, sortable: false },
      ],
      rowData: [
        { id: 1, name: "Alice", role: "Engineer" },
        { id: 2, name: "Bob", role: "Designer" },
      ],
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);

    engine.getApi().setSortModel([{ colId: "name", sort: "desc" }]);

    const idHeader = host.querySelector('[data-col-id="id"]');
    const nameHeader = host.querySelector('[data-col-id="name"]');
    const roleHeader = host.querySelector('[data-col-id="role"]');

    expect(idHeader?.getAttribute("aria-sort")).toBe("none");
    expect(nameHeader?.getAttribute("aria-sort")).toBe("descending");
    expect(roleHeader?.hasAttribute("aria-sort")).toBe(false);
  });
});

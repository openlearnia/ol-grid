/** @vitest-environment happy-dom */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createGridEngine } from "@ol-grid/core";
import { SortModule } from "@ol-grid/sort";
import { createDomRenderer } from "@ol-grid/dom-renderer";

describe("DomRenderer cell renderers", () => {
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

  it("renders string-key registry renderers and function renderers", () => {
    const engine = createGridEngine({
      modules: [SortModule],
      columnDefs: [
        {
          field: "name",
          headerName: "Name",
          width: 140,
          cellRenderer: "badge",
        },
        {
          field: "role",
          headerName: "Role",
          width: 120,
          cellRenderer: ({ value }) => `fn:${String(value)}`,
        },
      ],
      rowData: [{ name: "Alice", role: "Engineer" }],
    });

    engine.registerCellRenderer("badge", ({ value }) => `badge:${String(value)}`);

    const renderer = createDomRenderer();
    engine.mount(host, renderer);

    const nameCell = host.querySelector('.ol-grid__body [data-col-id="name"]');
    const roleCell = host.querySelector('.ol-grid__body [data-col-id="role"]');

    expect(nameCell?.textContent).toBe("badge:Alice");
    expect(roleCell?.textContent).toBe("fn:Engineer");

    engine.destroy();
  });
});

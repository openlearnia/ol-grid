/** @vitest-environment happy-dom */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { createGridEngine } from "@ol-grid/core";
import { SortModule } from "@ol-grid/sort";
import { createDomRenderer } from "@ol-grid/dom-renderer";
import { buildPortalsFromFrame } from "./cell-renderer-portals.js";

function StatusBadge({ value }: { value: unknown }) {
  return createElement("span", { className: "status-badge" }, String(value));
}

describe("buildPortalsFromFrame", () => {
  it("creates portals for framework cell renderers", () => {
    const host = document.createElement("div");
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

    const engine = createGridEngine({
      modules: [SortModule],
      frameworkCellRenderers: true,
      columnDefs: [
        {
          field: "status",
          headerName: "Status",
          width: 120,
          cellRenderer: StatusBadge,
        },
      ],
      rowData: [{ status: "Active" }],
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);

    const frame = engine.getLastFrame();
    expect(frame).not.toBeNull();

    const portals = buildPortalsFromFrame(frame!, engine, renderer);
    expect(portals).toHaveLength(1);

    const mountHost = document.createElement("div");
    document.body.appendChild(mountHost);
    const root = createRoot(mountHost);
    flushSync(() => {
      root.render(createElement("div", null, portals.map((entry) => entry.portal)));
    });

    expect(host.querySelector(".ol-grid__body .status-badge")?.textContent).toBe("Active");

    root.unmount();
    engine.destroy();
    host.remove();
    mountHost.remove();
  });
});

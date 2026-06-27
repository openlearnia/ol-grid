import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { describe, expect, it } from "vitest";
import { createGridEngine } from "@ol-grid/core";
import { SortModule } from "@ol-grid/sort";
import { createDomRenderer } from "@ol-grid/dom-renderer";
import { buildEditorPortalsFromFrame } from "../cell-editor-portals.js";

function ColorEditor({
  value,
  onValueChange,
}: {
  value: unknown;
  onValueChange: (value: unknown) => void;
}) {
  return createElement("input", {
    className: "color-editor",
    value: String(value ?? ""),
    onChange: (event: Event) => {
      onValueChange((event.target as HTMLInputElement).value);
    },
  });
}

describe("buildEditorPortalsFromFrame", () => {
  it("creates an editor portal for the active framework cell editor", () => {
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
      frameworkCellEditors: true,
      columnDefs: [
        {
          field: "color",
          headerName: "Color",
          width: 120,
          editable: true,
          cellEditor: ColorEditor,
        },
      ],
      rowData: [{ color: "red" }],
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.startEditingCell(0, "color");

    const frame = engine.getLastFrame();
    expect(frame).not.toBeNull();
    expect(frame!.editing).not.toBeNull();

    const portals = buildEditorPortalsFromFrame(frame!, engine, renderer);
    expect(portals).toHaveLength(1);

    const mountHost = document.createElement("div");
    document.body.appendChild(mountHost);
    const root = createRoot(mountHost);
    flushSync(() => {
      root.render(createElement("div", null, portals.map((entry) => entry.portal)));
    });

    expect(host.querySelector(".ol-grid__body input.color-editor")).not.toBeNull();
    expect(
      (host.querySelector(".ol-grid__body input.color-editor") as HTMLInputElement).value,
    ).toBe("red");

    root.unmount();
    engine.destroy();
    host.remove();
    mountHost.remove();
  });
});

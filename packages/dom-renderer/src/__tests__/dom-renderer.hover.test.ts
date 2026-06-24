/** @vitest-environment happy-dom */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createGridEngine } from "@ol-grid/core";
import { createDomRenderer } from "../dom-renderer.js";

interface Person {
  id: number;
  name: string;
  salary: number;
}

describe("DomRenderer row hover", () => {
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

  it("highlights the full row across pinned-left, center, and pinned-right on hover", () => {
    const rowData = Array.from({ length: 10 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
      salary: 70000 + index * 1000,
    }));

    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72, pinned: "left" },
        { field: "name", headerName: "Name", width: 140 },
        { field: "salary", headerName: "Salary", width: 110, pinned: "right" },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });

    const rowsPinned = host.querySelector<HTMLElement>(".ol-grid__rows--pinned");
    const rowsCenter = host.querySelector<HTMLElement>(".ol-grid__rows--center");
    const rowsPinnedRight = host.querySelector<HTMLElement>(".ol-grid__rows--pinned-right");
    const bodyInner = host.querySelector<HTMLElement>(".ol-grid__body-inner");

    expect(rowsPinned).not.toBeNull();
    expect(rowsCenter).not.toBeNull();
    expect(rowsPinnedRight).not.toBeNull();
    expect(bodyInner).not.toBeNull();

    const getRow = (container: ParentNode, rowIndex: number): HTMLElement => {
      const row = container.querySelector<HTMLElement>(
        `.ol-grid__row[data-row-index="${rowIndex}"]`,
      );
      expect(row).not.toBeNull();
      return row!;
    };

    const targetIndex = 2;
    const centerCell = getRow(rowsCenter!, targetIndex).querySelector<HTMLElement>(
      "[data-col-id='name']",
    );
    expect(centerCell).not.toBeNull();

    centerCell!.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));

    expect(getRow(rowsPinned!, targetIndex).classList.contains("ol-grid__row--hover")).toBe(
      true,
    );
    expect(getRow(rowsCenter!, targetIndex).classList.contains("ol-grid__row--hover")).toBe(true);
    expect(getRow(rowsPinnedRight!, targetIndex).classList.contains("ol-grid__row--hover")).toBe(
      true,
    );
    expect(getRow(rowsPinned!, 0).classList.contains("ol-grid__row--hover")).toBe(false);

    const pinnedCell = getRow(rowsPinned!, targetIndex).querySelector<HTMLElement>(
      "[data-col-id='id']",
    );
    expect(pinnedCell).not.toBeNull();
    pinnedCell!.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));

    expect(getRow(rowsCenter!, targetIndex).classList.contains("ol-grid__row--hover")).toBe(true);
    expect(getRow(rowsPinnedRight!, targetIndex).classList.contains("ol-grid__row--hover")).toBe(
      true,
    );

    bodyInner!.dispatchEvent(
      new MouseEvent("mouseleave", { bubbles: false, relatedTarget: document.body }),
    );

    expect(getRow(rowsPinned!, targetIndex).classList.contains("ol-grid__row--hover")).toBe(
      false,
    );
    expect(getRow(rowsCenter!, targetIndex).classList.contains("ol-grid__row--hover")).toBe(
      false,
    );
    expect(getRow(rowsPinnedRight!, targetIndex).classList.contains("ol-grid__row--hover")).toBe(
      false,
    );
  });
});

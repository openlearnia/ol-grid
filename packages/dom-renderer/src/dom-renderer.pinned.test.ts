/** @vitest-environment happy-dom */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createGridEngine } from "@ol-grid/core";
import { createDomRenderer } from "./dom-renderer.js";

interface Person {
  id: number;
  name: string;
  salary: number;
}

function salaryForIndex(index: number): number {
  return 70000 + (index % 50) * 1500;
}

describe("DomRenderer pinned-right virtualization", () => {
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

  it("keeps pinned-right rows aligned with center after vertical scroll", () => {
    const rowData = Array.from({ length: 50 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
      salary: salaryForIndex(index),
    }));

    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72, pinned: "left" },
        { field: "name", headerName: "Name", width: 140 },
        {
          field: "salary",
          headerName: "Salary",
          width: 110,
          pinned: "right",
        },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });
    engine.getStore().dispatch({ type: "SET_SCROLL", scrollTop: 26 * 32, scrollLeft: 0 });

    const rowsCenter = host.querySelector<HTMLElement>(".ol-grid__rows--center");
    const rowsPinnedRight = host.querySelector<HTMLElement>(".ol-grid__rows--pinned-right");

    expect(rowsCenter).not.toBeNull();
    expect(rowsPinnedRight).not.toBeNull();
    expect(rowsPinnedRight!.style.transform).toBe(rowsCenter!.style.transform);
    expect(rowsPinnedRight!.style.transform).not.toBe("");

    const centerRows = [...rowsCenter!.querySelectorAll<HTMLElement>(".ol-grid__row")];
    const pinnedRightRows = [...rowsPinnedRight!.querySelectorAll<HTMLElement>(".ol-grid__row")];

    expect(centerRows.length).toBeGreaterThan(0);
    expect(pinnedRightRows.length).toBe(centerRows.length);

    for (const centerRow of centerRows) {
      const rowIndex = Number(centerRow.dataset.rowIndex);
      const pinnedRightRow = pinnedRightRows.find(
        (row) => row.dataset.rowIndex === centerRow.dataset.rowIndex,
      );

      expect(pinnedRightRow).toBeDefined();

      const centerName = centerRow.querySelector("[data-col-id='name']")?.textContent;
      const salaryCell = pinnedRightRow!.querySelector("[data-col-id='salary']");
      expect(centerName).toBe(`User ${rowIndex + 1}`);
      expect(salaryCell?.textContent).toBe(String(salaryForIndex(rowIndex)));
    }

    const firstVisibleRow = centerRows[0];
    expect(Number(firstVisibleRow?.dataset.rowIndex)).toBeLessThanOrEqual(26);
    expect(centerRows.some((row) => row.dataset.rowIndex === "26")).toBe(true);
  });
});

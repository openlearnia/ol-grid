/** @vitest-environment happy-dom */
import { describe, expect, it } from "vitest";
import type { RenderFrame } from "@ol-grid/core";
import { reconcileRowOrder, RowPool } from "../row-pool.js";

function createRow(id: string, rowIndex: number): RenderFrame["rows"][number] {
  return {
    id,
    rowIndex,
    selected: false,
    cells: [{ colId: "a", value: `v${rowIndex}` }],
  };
}

function createMinimalFrame(rows: RenderFrame["rows"], rowOffset: number): RenderFrame {
  const rowStart = rows[0]?.rowIndex ?? 0;
  const rowEnd = rows[rows.length - 1]?.rowIndex ?? -1;
  return {
    virtualRange: { rowStart, rowEnd, colStart: 0, colEnd: 0 },
    rowHeight: 32,
    rowOffset,
    totalHeight: 3200,
    totalWidth: 200,
    renderWidth: 200,
    pinnedLeftWidth: 0,
    centerWidth: 200,
    centerViewportWidth: 200,
    pinnedRightWidth: 0,
    columns: [{ colId: "a", headerName: "A", width: 200, left: 0, sort: null, sortable: false, pinned: null }],
    pinnedLeftColumns: [],
    centerColumns: [{ colId: "a", headerName: "A", width: 200, left: 0, sort: null, sortable: false, pinned: null }],
    pinnedRightColumns: [],
    selectedRowIds: [],
    rows,
    focusedCell: null,
    focusedHeaderColId: null,
    editing: null,
    filterModel: {},
    openFilterColId: null,
    showFloatingFilters: false,
  };
}

describe("reconcileRowOrder", () => {
  it("inserts and removes nodes without replaceChildren", () => {
    const container = document.createElement("div");
    const a = document.createElement("div");
    const b = document.createElement("div");
    const c = document.createElement("div");
    a.textContent = "a";
    b.textContent = "b";
    c.textContent = "c";
    container.append(a, b);

    reconcileRowOrder(container, [c, a]);

    expect([...container.children].map((el) => el.textContent)).toEqual(["c", "a"]);
    expect(container.contains(b)).toBe(false);
  });
});

describe("RowPool", () => {
  it("applies transform before row sync on scroll fast-path", () => {
    const pool = new RowPool();
    const pinnedLeft = document.createElement("div");
    const center = document.createElement("div");
    const pinnedRight = document.createElement("div");
    const containers = { pinnedLeft, center, pinnedRight };

    pool.applyRowOffset(containers, 160);
    expect(center.style.transform).toBe("translate3d(0, 160px, 0)");
    expect(pinnedLeft.style.transform).toBe("translate3d(0, 160px, 0)");
    expect(pinnedRight.style.transform).toBe("translate3d(0, 160px, 0)");

    const frame = createMinimalFrame([createRow("1", 5), createRow("2", 6)], 160);
    pool.syncFrame(
      containers,
      frame,
      (rowEl, row) => {
        rowEl.dataset.rowId = row.id;
        rowEl.dataset.rowIndex = String(row.rowIndex);
      },
      (rowEl, _section, row) => {
        rowEl.textContent = row.cells[0]?.value ?? "";
      },
    );

    expect(center.style.transform).toBe("translate3d(0, 160px, 0)");
    expect(center.querySelectorAll(".ol-grid__row").length).toBe(2);
  });

  it("recycles row nodes when virtual range shifts incrementally", () => {
    const pool = new RowPool();
    const center = document.createElement("div");
    const containers = {
      pinnedLeft: document.createElement("div"),
      center,
      pinnedRight: document.createElement("div"),
    };

    const firstFrame = createMinimalFrame(
      [createRow("10", 10), createRow("11", 11), createRow("12", 12)],
      320,
    );
    pool.syncFrame(
      containers,
      firstFrame,
      (rowEl, row) => {
        rowEl.dataset.rowId = row.id;
      },
      (rowEl, _section, row) => {
        rowEl.textContent = row.id;
      },
    );

    const firstNodes = [...center.querySelectorAll<HTMLElement>(".ol-grid__row")];
    expect(firstNodes.map((el) => el.textContent)).toEqual(["10", "11", "12"]);

    const secondFrame = createMinimalFrame(
      [createRow("11", 11), createRow("12", 12), createRow("13", 13)],
      352,
    );
    pool.applyRowOffset(containers, 352);
    pool.syncFrame(
      containers,
      secondFrame,
      (rowEl, row) => {
        rowEl.dataset.rowId = row.id;
      },
      (rowEl, _section, row) => {
        rowEl.textContent = row.id;
      },
    );

    const secondNodes = [...center.querySelectorAll<HTMLElement>(".ol-grid__row")];
    expect(secondNodes.map((el) => el.textContent)).toEqual(["11", "12", "13"]);
    expect(secondNodes[0]).toBe(firstNodes[1]);
    expect(secondNodes[1]).toBe(firstNodes[2]);
    expect(center.style.transform).toBe("translate3d(0, 352px, 0)");
  });

  it("tracks overlapping virtual ranges", () => {
    const pool = new RowPool();
    const containers = {
      pinnedLeft: document.createElement("div"),
      center: document.createElement("div"),
      pinnedRight: document.createElement("div"),
    };
    pool.syncFrame(
      containers,
      createMinimalFrame([createRow("1", 10), createRow("2", 11)], 320),
      () => {},
      () => {},
    );
    expect(pool.rangeOverlapsApplied(11, 14)).toBe(true);
    expect(pool.rangeOverlapsApplied(20, 25)).toBe(false);
  });

  it("detaches warm-only rows from DOM but keeps nodes in map for reuse", () => {
    const pool = new RowPool();
    const center = document.createElement("div");
    const containers = {
      pinnedLeft: document.createElement("div"),
      center,
      pinnedRight: document.createElement("div"),
    };

    const expandedRows = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((index) =>
      createRow(String(index), index),
    );
    const expandedFrame = createMinimalFrame(expandedRows, 256);
    expandedFrame.virtualRange = { rowStart: 8, rowEnd: 18, colStart: 0, colEnd: 0 };
    expandedFrame.totalHeight = 100 * 32;

    pool.syncFrame(
      containers,
      expandedFrame,
      (rowEl, row) => {
        rowEl.className = "ol-grid__row";
        rowEl.dataset.rowId = row.id;
        rowEl.dataset.rowIndex = String(row.rowIndex);
      },
      () => {},
    );
    expect(center.querySelectorAll(".ol-grid__row").length).toBe(11);

    const shrunkRows = [10, 11, 12, 13, 14, 15].map((index) => createRow(String(index), index));
    const shrunkFrame = createMinimalFrame(shrunkRows, 320);
    shrunkFrame.virtualRange = { rowStart: 10, rowEnd: 15, colStart: 0, colEnd: 0 };
    shrunkFrame.totalHeight = 100 * 32;

    pool.syncFrame(
      containers,
      shrunkFrame,
      (rowEl, row) => {
        rowEl.className = "ol-grid__row";
        rowEl.dataset.rowId = row.id;
        rowEl.dataset.rowIndex = String(row.rowIndex);
      },
      () => {},
    );

    expect(pool.getWarmRange()).toEqual({ rowStart: 8, rowEnd: 18 });
    expect(center.querySelectorAll(".ol-grid__row").length).toBe(6);
    expect(pool.hasMountedRows()).toBe(true);

    const remountedFrame = createMinimalFrame(
      [8, 9, 10].map((index) => createRow(String(index), index)),
      256,
    );
    remountedFrame.virtualRange = { rowStart: 8, rowEnd: 10, colStart: 0, colEnd: 0 };
    remountedFrame.totalHeight = 100 * 32;

    pool.syncFrame(
      containers,
      remountedFrame,
      (rowEl, row) => {
        rowEl.className = "ol-grid__row";
        rowEl.dataset.rowId = row.id;
        rowEl.dataset.rowIndex = String(row.rowIndex);
      },
      () => {},
    );
    expect(center.querySelectorAll(".ol-grid__row").length).toBe(3);
  });

  it("does not mount warm-only rows that would break rowOffset stacking", () => {
    const pool = new RowPool();
    const center = document.createElement("div");
    const containers = {
      pinnedLeft: document.createElement("div"),
      center,
      pinnedRight: document.createElement("div"),
    };

    const frameRows = [10, 11, 12].map((index) => createRow(String(index), index));
    const frame = createMinimalFrame(frameRows, 320);
    frame.virtualRange = { rowStart: 10, rowEnd: 12, colStart: 0, colEnd: 0 };
    frame.totalHeight = 100 * 32;

    pool.expandWarmRange(8, 14);
    pool.syncFrame(
      containers,
      frame,
      (rowEl, row) => {
        rowEl.className = "ol-grid__row";
        rowEl.dataset.rowId = row.id;
        rowEl.dataset.rowIndex = String(row.rowIndex);
      },
      (rowEl, _section, row) => {
        rowEl.textContent = row.cells[0]?.value ?? "";
      },
    );

    const mounted = [...center.querySelectorAll<HTMLElement>(".ol-grid__row")];
    expect(mounted.map((el) => el.dataset.rowIndex)).toEqual(["10", "11", "12"]);
    expect(mounted.map((el) => el.textContent)).toEqual(["v10", "v11", "v12"]);
  });
});

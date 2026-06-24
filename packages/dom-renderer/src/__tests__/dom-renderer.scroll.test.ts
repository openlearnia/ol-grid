/** @vitest-environment happy-dom */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createGridEngine } from "@ol-grid/core";
import { createDomRenderer } from "../dom-renderer.js";

interface ScrollRow {
  id: number;
  name: string;
}

interface WideRow {
  id: number;
  name: string;
  role: string;
  department: string;
}

describe("DomRenderer scrollbar scroll sync", () => {
  let host: HTMLElement;
  let rafQueue: FrameRequestCallback[];

  beforeEach(() => {
    host = document.createElement("div");
    host.style.width = "800px";
    host.style.height = "400px";
    document.body.appendChild(host);

    rafQueue = [];
    let rafId = 1;
    globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return rafId++;
    };
    globalThis.cancelAnimationFrame = () => {
      rafQueue = [];
    };
    globalThis.ResizeObserver = class {
      observe() {}
      disconnect() {}
      unobserve() {}
    };
  });

  function flushRaf(maxFrames = 4): void {
    for (let i = 0; i < maxFrames && rafQueue.length > 0; i++) {
      const batch = rafQueue.splice(0);
      for (const cb of batch) cb(performance.now());
    }
  }

  afterEach(() => {
    host.remove();
  });

  it("applies rowOffset transform synchronously on scroll before store refresh", () => {
    const rowData = Array.from({ length: 100 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
    }));

    const engine = createGridEngine<ScrollRow>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140 },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });

    const body = host.querySelector<HTMLElement>(".ol-grid__body");
    const rowsCenter = host.querySelector<HTMLElement>(".ol-grid__rows--center");
    expect(body).not.toBeNull();
    expect(rowsCenter).not.toBeNull();

    body!.scrollTop = 480;
    body!.dispatchEvent(new Event("scroll"));

    expect(rowsCenter!.style.transform).toBe("translate3d(0, 480px, 0)");
    expect(engine.getStore().getState().scrollTop).toBe(480);
  });
  it("syncs store scrollTop and renders visible rows after scroll", () => {
    const rowData = Array.from({ length: 100 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
    }));

    const engine = createGridEngine<ScrollRow>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140 },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });

    const body = host.querySelector<HTMLElement>(".ol-grid__body");
    const rowsCenter = host.querySelector<HTMLElement>(".ol-grid__rows--center");
    expect(body).not.toBeNull();
    expect(rowsCenter).not.toBeNull();

    body!.scrollTop = 480;
    body!.dispatchEvent(new Event("scroll"));
    flushRaf();

    expect(engine.getStore().getState().scrollTop).toBe(480);
    expect(rowsCenter!.style.transform).toBe("translate3d(0, 480px, 0)");

    const centerRows = [...rowsCenter!.querySelectorAll<HTMLElement>(".ol-grid__row")];
    expect(centerRows.some((row) => row.dataset.rowIndex === "15")).toBe(true);
    expect(Number(centerRows[0]?.dataset.rowIndex)).toBeLessThanOrEqual(15);
  });

  it("renders rows after a large scroll jump", () => {
    const rowData = Array.from({ length: 500 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
    }));

    const engine = createGridEngine<ScrollRow>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140 },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });

    const body = host.querySelector<HTMLElement>(".ol-grid__body");
    const rowsCenter = host.querySelector<HTMLElement>(".ol-grid__rows--center");
    expect(body).not.toBeNull();
    expect(rowsCenter).not.toBeNull();

    body!.scrollTop = 3200;
    body!.dispatchEvent(new Event("scroll"));

    expect(engine.getStore().getState().scrollTop).toBe(3200);
    const centerRows = [...rowsCenter!.querySelectorAll<HTMLElement>(".ol-grid__row")];
    expect(centerRows.length).toBeGreaterThan(0);
    expect(centerRows.some((row) => Number(row.dataset.rowIndex) >= 90)).toBe(true);
    expect(centerRows.some((row) => Number(row.dataset.rowIndex) <= 110)).toBe(true);
  });

  it("mounts target rows synchronously on a 2000px scroll jump before paint", () => {
    const rowData = Array.from({ length: 500 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
    }));

    const engine = createGridEngine<ScrollRow>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140 },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });

    const body = host.querySelector<HTMLElement>(".ol-grid__body");
    const rowsCenter = host.querySelector<HTMLElement>(".ol-grid__rows--center");
    const rowsPinned = host.querySelector<HTMLElement>(".ol-grid__rows--pinned");
    expect(body).not.toBeNull();
    expect(rowsCenter).not.toBeNull();
    expect(rowsPinned).not.toBeNull();

    body!.scrollTop = 2000;
    body!.dispatchEvent(new Event("scroll"));

    const centerRows = [...rowsCenter!.querySelectorAll<HTMLElement>(".ol-grid__row")];
    const pinnedRows = [...rowsPinned!.querySelectorAll<HTMLElement>(".ol-grid__row")];
    expect(centerRows.length).toBeGreaterThan(0);
    expect(pinnedRows.length).toBe(centerRows.length);
    expect(centerRows.some((row) => Number(row.dataset.rowIndex) >= 55)).toBe(true);
    expect(centerRows.some((row) => Number(row.dataset.rowIndex) <= 75)).toBe(true);
    expect(body!.scrollTop).toBe(2000);
    expect(rowsCenter!.style.transform).toBe("translate3d(0, 1984px, 0)");
    expect(rowsPinned!.style.transform).toBe("translate3d(0, 1984px, 0)");
  });

  it("renders visible rows on first scroll after idle without waiting for rAF", () => {
    const rowData = Array.from({ length: 500 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
    }));

    const engine = createGridEngine<ScrollRow>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140 },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });

    const body = host.querySelector<HTMLElement>(".ol-grid__body");
    const rowsCenter = host.querySelector<HTMLElement>(".ol-grid__rows--center");
    expect(body).not.toBeNull();
    expect(rowsCenter).not.toBeNull();

    body!.scrollTop = 500;
    body!.dispatchEvent(new Event("scroll"));
    flushRaf(8);
    expect(engine.getStore().getState().scrollTop).toBe(500);

    // Native scrollbar can move scrollTop before the scroll event; sync immediately.
    body!.scrollTop = 900;
    renderer.syncScrollFromViewport();

    expect(engine.getStore().getState().scrollTop).toBe(900);
    const centerRows = [...rowsCenter!.querySelectorAll<HTMLElement>(".ol-grid__row")];
    expect(centerRows.length).toBeGreaterThan(0);
    expect(centerRows.some((row) => Number(row.dataset.rowIndex) >= 24)).toBe(true);
    expect(centerRows.some((row) => Number(row.dataset.rowIndex) <= 34)).toBe(true);
    expect(rowsCenter!.style.transform).toBe("translate3d(0, 896px, 0)");
  });

  it("syncs horizontal scroll into store synchronously", () => {
    const rowData = [
      { id: 1, name: "Alice", role: "Engineer", department: "Platform" },
    ];

    const engine = createGridEngine<WideRow>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 400 },
        { field: "role", headerName: "Role", width: 400 },
        { field: "department", headerName: "Department", width: 400 },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 300, height: 200 });

    const centerScroll = host.querySelector<HTMLElement>(".ol-grid__center-scroll");
    expect(centerScroll).not.toBeNull();

    centerScroll!.scrollLeft = 250;
    centerScroll!.dispatchEvent(new Event("scroll"));

    expect(engine.getStore().getState().scrollLeft).toBe(250);
  });

  it("shows correct cell data after scrolling down and up without stale rows", () => {
    const rowData = Array.from({ length: 500 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
    }));

    const engine = createGridEngine<ScrollRow>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140 },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });

    const body = host.querySelector<HTMLElement>(".ol-grid__body");
    const rowsCenter = host.querySelector<HTMLElement>(".ol-grid__rows--center");
    expect(body).not.toBeNull();
    expect(rowsCenter).not.toBeNull();

    function visibleNameCells(): Array<{ rowIndex: number; name: string }> {
      return [...rowsCenter!.querySelectorAll<HTMLElement>(".ol-grid__row")]
        .map((rowEl) => {
          const rowIndex = Number(rowEl.dataset.rowIndex);
          const nameCell = rowEl.querySelector<HTMLElement>('[data-col-id="name"]');
          return { rowIndex, name: nameCell?.textContent ?? "" };
        })
        .filter((entry) => !Number.isNaN(entry.rowIndex));
    }

    function assertVisibleRowsMatchScroll(scrollTop: number): void {
      const firstVisible = Math.floor(scrollTop / 32);
      const visible = visibleNameCells();
      expect(visible.length).toBeGreaterThan(0);
      for (const { rowIndex, name } of visible) {
        expect(name).toBe(`User ${rowIndex + 1}`);
        expect(rowIndex).toBeGreaterThanOrEqual(firstVisible - 15);
        expect(rowIndex).toBeLessThanOrEqual(firstVisible + 20);
      }
    }

    body!.scrollTop = 500;
    body!.dispatchEvent(new Event("scroll"));
    flushRaf();
    assertVisibleRowsMatchScroll(500);

    body!.scrollTop = 900;
    body!.dispatchEvent(new Event("scroll"));
    flushRaf();
    assertVisibleRowsMatchScroll(900);

    body!.scrollTop = 500;
    body!.dispatchEvent(new Event("scroll"));
    flushRaf();
    assertVisibleRowsMatchScroll(500);

    const namesAt500 = visibleNameCells().map((entry) => entry.name);
    expect(new Set(namesAt500).size).toBe(namesAt500.length);
  });

  it("retains row children after scroll idle when range shrinks", () => {
    const rowData = Array.from({ length: 500 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
    }));

    const engine = createGridEngine<ScrollRow>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140 },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });

    const body = host.querySelector<HTMLElement>(".ol-grid__body");
    const rowsCenter = host.querySelector<HTMLElement>(".ol-grid__rows--center");
    expect(body).not.toBeNull();
    expect(rowsCenter).not.toBeNull();

    body!.scrollTop = 1600;
    body!.dispatchEvent(new Event("scroll"));
    flushRaf();

    const rowsAfterScroll = rowsCenter!.querySelectorAll(".ol-grid__row").length;
    expect(rowsAfterScroll).toBeGreaterThan(0);

    // Simulate idle: store matches DOM, velocity overscan drops on next refresh.
    engine.getStore().dispatch({
      type: "SET_SCROLL",
      scrollTop: body!.scrollTop,
      scrollLeft: 0,
    });
    flushRaf();

    const rowsAfterIdle = rowsCenter!.querySelectorAll(".ol-grid__row").length;
    expect(rowsAfterIdle).toBeGreaterThan(0);
    expect(rowsAfterIdle).toBeLessThanOrEqual(rowsAfterScroll);
  });

  it("first scroll after idle has row children immediately", () => {
    const rowData = Array.from({ length: 500 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
    }));

    const engine = createGridEngine<ScrollRow>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140 },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });

    const body = host.querySelector<HTMLElement>(".ol-grid__body");
    const rowsCenter = host.querySelector<HTMLElement>(".ol-grid__rows--center");
    expect(body).not.toBeNull();
    expect(rowsCenter).not.toBeNull();

    body!.scrollTop = 1600;
    body!.dispatchEvent(new Event("scroll"));
    flushRaf();

    engine.getStore().dispatch({
      type: "SET_SCROLL",
      scrollTop: body!.scrollTop,
      scrollLeft: 0,
    });
    flushRaf();

    body!.scrollTop = 1632;
    body!.dispatchEvent(new Event("scroll"));

    expect(rowsCenter!.querySelectorAll(".ol-grid__row").length).toBeGreaterThan(0);
    expect(rowsCenter!.style.transform).toBe("translate3d(0, 1632px, 0)");
  });

  it("does not reset body.scrollTop when DOM leads store during render", () => {
    const rowData = Array.from({ length: 100 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
    }));

    const engine = createGridEngine<ScrollRow>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140 },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });

    const body = host.querySelector<HTMLElement>(".ol-grid__body");
    expect(body).not.toBeNull();

    body!.scrollTop = 480;
    expect(engine.getStore().getState().scrollTop).toBe(0);

    engine.warmSyncRowsAtScrollTop(0, { overscanBefore: 8, overscanAfter: 8 });

    expect(body!.scrollTop).toBe(480);
    expect(engine.getStore().getState().scrollTop).toBe(480);
  });

  it("applies programmatic store scroll to DOM when body has not moved", () => {
    const rowData = Array.from({ length: 100 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
    }));

    const engine = createGridEngine<ScrollRow>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140 },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });

    const body = host.querySelector<HTMLElement>(".ol-grid__body");
    expect(body).not.toBeNull();
    expect(body!.scrollTop).toBe(0);

    engine.getStore().dispatch({ type: "SET_SCROLL", scrollTop: 480, scrollLeft: 0 });

    expect(body!.scrollTop).toBe(480);
    expect(engine.getStore().getState().scrollTop).toBe(480);
  });

  function mockVerticalScrollbarGutter(body: HTMLElement): void {
    Object.defineProperty(body, "offsetWidth", {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(body, "clientWidth", {
      configurable: true,
      value: 784,
    });
    body.getBoundingClientRect = () =>
      ({
        width: 800,
        height: 400,
        top: 0,
        left: 0,
        right: 800,
        bottom: 400,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
  }

  it("mounts rows before committing scroll on native track click jump", () => {
    const rowData = Array.from({ length: 500 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
    }));

    const engine = createGridEngine<ScrollRow>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140 },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });

    const body = host.querySelector<HTMLElement>(".ol-grid__body");
    const rowsCenter = host.querySelector<HTMLElement>(".ol-grid__rows--center");
    expect(body).not.toBeNull();
    expect(rowsCenter).not.toBeNull();

    body!.scrollTop = 3200;
    body!.dispatchEvent(new Event("scroll"));

    const centerRows = [...rowsCenter!.querySelectorAll<HTMLElement>(".ol-grid__row")];
    expect(centerRows.length).toBeGreaterThan(0);
    expect(centerRows.some((row) => Number(row.dataset.rowIndex) >= 90)).toBe(true);
    expect(body!.scrollTop).toBe(3200);
    expect(engine.getStore().getState().scrollTop).toBe(3200);
  });

  it("uses sync scroll during native scrollbar drag when ranges overlap", () => {
    const rowData = Array.from({ length: 500 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
    }));

    const engine = createGridEngine<ScrollRow>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140 },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });

    const body = host.querySelector<HTMLElement>(".ol-grid__body");
    const rowsCenter = host.querySelector<HTMLElement>(".ol-grid__rows--center");
    expect(body).not.toBeNull();
    expect(rowsCenter).not.toBeNull();

    body!.scrollTop = 480;
    body!.dispatchEvent(new Event("scroll"));
    flushRaf();

    mockVerticalScrollbarGutter(body!);
    body!.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        clientX: 792,
        clientY: 200,
      }),
    );

    body!.scrollTop = 544;
    body!.dispatchEvent(new Event("scroll"));

    const centerRows = [...rowsCenter!.querySelectorAll<HTMLElement>(".ol-grid__row")];
    expect(centerRows.length).toBeGreaterThan(0);
    expect(centerRows.some((row) => Number(row.dataset.rowIndex) === 17)).toBe(true);
    expect(body!.scrollTop).toBe(544);
    expect(rowsCenter!.style.transform).toBe("translate3d(0, 544px, 0)");
  });

  it("holds scrollTop at last committed position until rows mount on track jump", () => {
    const rowData = Array.from({ length: 500 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
    }));

    const engine = createGridEngine<ScrollRow>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140 },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });

    const body = host.querySelector<HTMLElement>(".ol-grid__body");
    const rowsCenter = host.querySelector<HTMLElement>(".ol-grid__rows--center");
    expect(body).not.toBeNull();
    expect(rowsCenter).not.toBeNull();

    const heldPositions: number[] = [];
    const originalWarmSync = engine.warmSyncRowsAtScrollTop.bind(engine);
    engine.warmSyncRowsAtScrollTop = (scrollTop, overscan) => {
      heldPositions.push(body!.scrollTop);
      return originalWarmSync(scrollTop, overscan);
    };

    body!.scrollTop = 2000;
    body!.dispatchEvent(new Event("scroll"));

    expect(heldPositions.length).toBeGreaterThan(0);
    expect(heldPositions.every((top) => top === 0)).toBe(true);
    expect(body!.scrollTop).toBe(2000);
    expect(rowsCenter!.querySelectorAll(".ol-grid__row").length).toBeGreaterThan(0);
  });

  it("does not focus the first header on vertical scrollbar gutter pointerdown", () => {
    const rowData = Array.from({ length: 500 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
    }));

    const engine = createGridEngine<ScrollRow>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140 },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });

    const body = host.querySelector<HTMLElement>(".ol-grid__body");
    expect(body).not.toBeNull();
    expect(engine.getFocusedHeader()).toBeNull();

    mockVerticalScrollbarGutter(body!);
    body!.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        clientX: 792,
        clientY: 200,
      }),
    );
    host.focus();

    expect(engine.getFocusedHeader()).toBeNull();
    expect(host.querySelector(".ol-grid__header-cell--focused")).toBeNull();
    expect(
      (document.activeElement as HTMLElement | null)?.classList.contains(
        "ol-grid__header-cell",
      ),
    ).toBe(false);
  });
});

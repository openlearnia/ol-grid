/** @vitest-environment happy-dom */
import { beforeEach, describe, expect, it } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import { ModuleRegistry } from "@ol-grid/core";
import { FilterModule } from "@ol-grid/filter";
import { SortModule } from "@ol-grid/sort";
import { OlGrid } from "../OlGrid.js";

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

describe("OlGrid (Vue)", () => {
  beforeEach(() => {
    ModuleRegistry.clear();
    ModuleRegistry.register(SortModule);
    ModuleRegistry.register(FilterModule);
    installDomMocks();
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("mounts and exposes api via expose", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);

    let exposedApi: unknown = null;
    const App = defineComponent({
      setup() {
        return () =>
          h(OlGrid, {
            ref: (instance: { api: unknown } | null) => {
              exposedApi = instance?.api ?? null;
            },
            columnDefs: [{ field: "name", headerName: "Name", width: 160 }],
            rowData: [{ name: "Alice" }],
            getRowId: ({ data }: { data: { name: string } }) => data.name,
            style: { width: 640, height: 320 },
          });
      },
    });

    const app = createApp(App);
    app.mount(host);
    await nextTick();

    expect(host.querySelector(".ol-grid-host")).not.toBeNull();
    expect(host.querySelector(".ol-grid__header-cell")?.textContent).toBe("Name");
    expect(exposedApi).not.toBeNull();

    app.unmount();
  });

  it("renders floating filter row when filter columns are defined", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);

    const App = defineComponent({
      setup() {
        return () =>
          h(OlGrid, {
            columnDefs: [
              { field: "name", headerName: "Name", width: 160, filter: "text", floatingFilter: true },
              { field: "salary", headerName: "Salary", width: 120, filter: "number" },
            ],
            rowData: [
              { id: 1, name: "Alice", salary: 90000 },
              { id: 2, name: "Bob", salary: 80000 },
            ],
            getRowId: ({ data }: { data: { id: number } }) => String(data.id),
            style: { width: 640, height: 320 },
          });
      },
    });

    const app = createApp(App);
    app.mount(host);
    await nextTick();

    expect(
      host.querySelector<HTMLElement>(".ol-grid__floating-filter-host[data-col-id='name']"),
    ).not.toBeNull();
    expect(host.querySelector(".ol-grid__floating-filters")?.hidden).toBe(false);

    app.unmount();
  });

  it("renders pagination panel and pages rows when pagination is enabled", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);

    const App = defineComponent({
      setup() {
        return () =>
          h(OlGrid, {
            columnDefs: [{ field: "name", headerName: "Name", width: 160 }],
            rowData: [
              { id: 1, name: "Alice" },
              { id: 2, name: "Bob" },
              { id: 3, name: "Carol" },
              { id: 4, name: "Dave" },
            ],
            pagination: true,
            paginationPageSize: 2,
            getRowId: ({ data }: { data: { id: number } }) => String(data.id),
            style: { width: 640, height: 320 },
          });
      },
    });

    const app = createApp(App);
    app.mount(host);
    await nextTick();

    expect(host.querySelector(".ol-grid__pagination")).not.toBeNull();
    expect(host.textContent).toContain("Alice");
    expect(host.textContent).toContain("Bob");
    expect(host.textContent).not.toContain("Carol");

    const next = host.querySelector<HTMLButtonElement>('button[aria-label="Next page"]');
    next?.click();
    await nextTick();

    expect(host.textContent).toContain("Carol");
    expect(host.textContent).toContain("Dave");
    expect(host.textContent).not.toContain("Alice");

    app.unmount();
  });
});

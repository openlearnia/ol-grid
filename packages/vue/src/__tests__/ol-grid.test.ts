/** @vitest-environment happy-dom */
import { beforeEach, describe, expect, it } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import { ModuleRegistry } from "@ol-grid/core";
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
});

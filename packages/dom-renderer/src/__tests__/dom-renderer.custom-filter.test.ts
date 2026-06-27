/** @vitest-environment happy-dom */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createGridEngine } from "@ol-grid/core";
import type { FilterComponent, FilterDisplayParams } from "@ol-grid/core";
import { FilterModule } from "@ol-grid/filter";
import { SortModule } from "@ol-grid/sort";
import { createDomRenderer } from "@ol-grid/dom-renderer";

interface Row {
  name: string;
  status: string;
}

function createStatusFilter(params: FilterDisplayParams<Row>): FilterComponent<Row> {
  let selected: string | null = null;
  const select = document.createElement("select");
  select.dataset.testid = "status-filter-select";
  for (const value of ["Active", "Contract"]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }
  select.addEventListener("change", () => {
    selected = select.value || null;
    params.filterChangedCallback();
  });

  return {
    init() {
      const existing = params.getModel();
      if (existing?.value) {
        selected = String(existing.value);
        select.value = selected;
      }
    },
    getGui: () => select,
    getModel: () =>
      selected ? { filterType: "custom", value: selected } : { filterType: "custom" },
    setModel(model) {
      selected = model?.value ? String(model.value) : null;
      if (selected) select.value = selected;
    },
    isFilterActive: () => !!selected,
    doesFilterPass: ({ data, filterModel }) =>
      !filterModel.value || data.status === filterModel.value,
  };
}

describe("DomRenderer custom filter", () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement("div");
    host.style.width = "640px";
    host.style.height = "320px";
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

  it("mounts custom filter popup and filters rows via doesFilterPass", () => {
    const engine = createGridEngine({
      modules: [SortModule, FilterModule],
      columnDefs: [
        { field: "name", headerName: "Name", width: 140 },
        { field: "status", headerName: "Status", width: 120, filter: "statusFilter" },
      ],
      rowData: [
        { name: "Alice", status: "Active" },
        { name: "Bob", status: "Contract" },
      ],
    });

    engine.registerFilterComponent("statusFilter", { create: createStatusFilter });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);

    const filterButton = host.querySelector('[data-col-id="status"] [data-filter-button="true"]');
    expect(filterButton).toBeTruthy();
    (filterButton as HTMLButtonElement).click();

    const select = host.querySelector<HTMLSelectElement>('[data-testid="status-filter-select"]');
    expect(select).toBeTruthy();

    select!.value = "Active";
    select!.dispatchEvent(new Event("change", { bubbles: true }));

    expect(engine.getDisplayedRowCount()).toBe(1);
    expect(engine.getApi().getFilterModel()).toEqual({
      status: { filterType: "custom", value: "Active" },
    });

    engine.destroy();
  });
});

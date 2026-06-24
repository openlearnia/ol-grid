import { describe, expect, it } from "vitest";
import { createGridEngine } from "@ol-grid/core";
import { SortModule } from "@ol-grid/sort";
import { PaginationModule } from "../pagination-module.js";

interface Row {
  id: number;
  name: string;
}

describe("PaginationModule integration", () => {
  it("slices rows by page size and exposes pagination API", () => {
    const rowData = Array.from({ length: 37 }, (_, index) => ({
      id: index + 1,
      name: `Row ${index + 1}`,
    }));

    const engine = createGridEngine<Row>({
      modules: [SortModule, PaginationModule],
      pagination: true,
      paginationPageSize: 10,
      getRowId: ({ data }) => String(data.id),
      columnDefs: [{ field: "name", headerName: "Name", width: 160 }],
      rowData,
    });

    expect(engine.getApi().getDisplayedRowCount()).toBe(10);
    expect(engine.getApi().paginationGetTotalPages()).toBe(4);
    expect(engine.getApi().paginationGetCurrentPage()).toBe(0);

    engine.getApi().paginationGoToPage(3);
    expect(engine.getApi().getDisplayedRowCount()).toBe(7);
    expect(engine.getApi().paginationGetCurrentPage()).toBe(3);

    engine.destroy();
  });

  it("resets to page 0 when filter reduces row count", () => {
    const engine = createGridEngine<Row>({
      modules: [SortModule, PaginationModule],
      pagination: true,
      paginationPageSize: 10,
      getRowId: ({ data }) => String(data.id),
      columnDefs: [{ field: "name", headerName: "Name", width: 160 }],
      rowData: Array.from({ length: 40 }, (_, index) => ({
        id: index + 1,
        name: index < 5 ? "match" : `Row ${index + 1}`,
      })),
    });

    engine.getApi().paginationGoToPage(2);
    engine.getApi().setQuickFilterText("match");

    expect(engine.getApi().paginationGetCurrentPage()).toBe(0);
    expect(engine.getApi().getDisplayedRowCount()).toBe(5);

    engine.destroy();
  });

  it("fits page size to viewport when paginationAutoPageSize is enabled", () => {
    const rowData = Array.from({ length: 100 }, (_, index) => ({
      id: index + 1,
      name: `Row ${index + 1}`,
    }));

    const engine = createGridEngine<Row>({
      modules: [SortModule, PaginationModule],
      pagination: true,
      paginationAutoPageSize: true,
      rowHeight: 32,
      getRowId: ({ data }) => String(data.id),
      columnDefs: [{ field: "name", headerName: "Name", width: 160 }],
      rowData,
    });

    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 320 });

    expect(engine.getApi().paginationGetPageSize()).toBe(10);
    expect(engine.getApi().getDisplayedRowCount()).toBe(10);

    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 640 });
    expect(engine.getApi().paginationGetPageSize()).toBe(20);

    engine.destroy();
  });
});

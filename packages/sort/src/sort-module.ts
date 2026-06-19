import type { GridContext, GridModule, GridOptions } from "@ol-grid/core";
import { getCellValue, resolveColId } from "@ol-grid/core";
import {
  applySingleColumnSort,
  applySortModel,
  getSortModel,
  sortRowNodes,
  toggleColumnSort,
} from "./sort.js";

export const SORT_MODULE_NAME = "SortModule";

function createSortStage(): import("@ol-grid/core").RowModelStage {
  return {
    name: "sort",
    order: 200,
    run(rows, ctx) {
      if (ctx.sortModel.length === 0) return rows;

      const colId = ctx.sortModel[0]!.colId;
      const sort = ctx.sortModel[0]!.sort;
      const colDef = ctx.columnDefs.find((def, index) => resolveColId(def, index) === colId);
      if (!colDef) return rows;

      return sortRowNodes(
        rows,
        sort,
        (node) => getCellValue(node, colDef, ctx.api, ctx.context),
        colDef.comparator,
      );
    },
  };
}

export function createSortController(ctx: GridContext) {
  const engine = ctx.getEngine();

  return {
    toggleColumnSort(colId: string): void {
      const state = ctx.getStore().getState();
      const current = state.columns.find((column) => column.colId === colId)?.sort ?? null;
      const nextSort = toggleColumnSort(current);
      const columns = applySingleColumnSort(state.columns, colId, nextSort);

      engine.getColumnModel().setColumnState(columns);
      ctx.getStore().dispatch({ type: "SET_COLUMNS", columns });
      engine.rebuildRowModel(columns);
      const options = ctx.getOptions() as GridOptions;
      options.sortModel = getSortModel(columns);
      options.onSortChanged?.({ api: ctx.getApi(), source: "uiColumnSorted" });
    },

    getSortModel() {
      return getSortModel(ctx.getStore().getState().columns);
    },

    setSortModel(
      model: Array<{ colId: string; sort: "asc" | "desc" }>,
      source: "api" | "uiColumnSorted" = "api",
    ): void {
      const columns = applySortModel(ctx.getStore().getState().columns, model);
      const options = ctx.getOptions() as GridOptions;
      options.sortModel = model;
      engine.getColumnModel().setColumnState(columns);
      ctx.getStore().dispatch({ type: "SET_COLUMNS", columns });
      engine.rebuildRowModel(columns);
      options.onSortChanged?.({ api: ctx.getApi(), source });
    },

    rebuildFromColumns(columns: import("@ol-grid/core").ColumnState[]): void {
      engine.rebuildRowModel(columns);
    },
  };
}

export type SortController = ReturnType<typeof createSortController>;

export const SortModule: GridModule = {
  name: SORT_MODULE_NAME,
  version: "0.0.0",
  rowModelStages: [createSortStage()],
  onGridCreate(ctx) {
    const controller = createSortController(ctx);
    ctx.getEngine().setSortController(controller);
    ctx.registerRowModelStage(createSortStage());
  },
  onGridDestroy(ctx) {
    ctx.getEngine().setSortController(null);
  },
};

export { compareValues } from "./compare-values.js";
export {
  sortRowNodes,
  toggleColumnSort,
  applySingleColumnSort,
  applySortModel,
  getSortModel,
} from "./sort.js";

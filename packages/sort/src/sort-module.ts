import type { GridContext, GridModule, GridOptions } from "@ol-grid/core";
import { flattenColumnDefs, getCellValue } from "@ol-grid/core";
import {
  applySortModel,
  getSortModel,
  sortModelsEqual,
  sortRowNodesMulti,
  toggleColumnSortInColumns,
  type MultiSortEntry,
} from "./sort.js";

export const SORT_MODULE_NAME = "SortModule";

function resolveSortValueGetter(
  colDef: import("@ol-grid/core").ColumnDef,
  ctx: GridContext,
): (node: import("@ol-grid/core").RowNode) => unknown {
  const field = colDef.field;
  // Fast path: plain field columns skip getCellValue / API context on every compare.
  const useDirectField = !!field && !colDef.valueGetter && !colDef.comparator;
  return useDirectField
    ? (node) => (node.data as Record<string, unknown> | undefined)?.[field]
    : (node) => getCellValue(node, colDef, ctx.getApi(), ctx.getOptions().context);
}

function buildSortEntries(
  ctx: GridContext,
  sortModel: Array<{ colId: string; sort: "asc" | "desc" }>,
): MultiSortEntry<unknown>[] {
  const flatDefs = flattenColumnDefs(ctx.getOptions().columnDefs ?? []);
  const entries: MultiSortEntry<unknown>[] = [];

  for (const entry of sortModel) {
    const colDef = flatDefs.find((column) => column.colId === entry.colId)?.def;
    if (!colDef) continue;
    entries.push({
      colId: entry.colId,
      sort: entry.sort,
      getValue: resolveSortValueGetter(colDef, ctx),
      comparator: colDef.comparator,
    });
  }

  return entries;
}

function createSortStage(ctx: GridContext): import("@ol-grid/core").RowModelStage {
  return {
    name: "sort",
    // After filter (~100); before pagination (300).
    order: 200,
    run(rows) {
      const sortModel = getSortModel(ctx.getStore().getState().columns);
      if (sortModel.length === 0) return rows;

      const options = ctx.getOptions() as GridOptions;
      const accentedSort = options.accentedSort === true;
      const sorted = sortRowNodesMulti(rows, buildSortEntries(ctx, sortModel), accentedSort);

      const postSortRows = options.postSortRows;
      if (postSortRows) {
        postSortRows({ nodes: sorted });
      }
      return sorted;
    },
  };
}

function isAdditiveSort(
  options: GridOptions,
  event?: Pick<MouseEvent, "shiftKey" | "ctrlKey" | "metaKey">,
): boolean {
  if (options.suppressMultiSort) return false;
  if (options.alwaysMultiSort) return true;
  if (!event) return false;

  const key = options.multiSortKey ?? "shift";
  if (key === "ctrl") {
    // metaKey covers macOS Cmd when multiSortKey is "ctrl".
    return event.ctrlKey || event.metaKey;
  }
  return event.shiftKey;
}

export function createSortController(ctx: GridContext) {
  const engine = ctx.getEngine();

  return {
    toggleColumnSort(
      colId: string,
      event?: Pick<MouseEvent, "shiftKey" | "ctrlKey" | "metaKey">,
    ): void {
      ctx.getStore().batch(() => {
        const state = ctx.getStore().getState();
        const options = ctx.getOptions() as GridOptions;
        const additive = isAdditiveSort(options, event);
        const columns = toggleColumnSortInColumns(state.columns, colId, additive);
        const nextModel = getSortModel(columns);
        const previousModel = getSortModel(state.columns);
        // Cycle asc → desc → null can be a no-op when sort was already cleared.
        if (sortModelsEqual(previousModel, nextModel)) return;

        engine.getColumnModel().setColumnState(columns);
        ctx.getStore().dispatch({ type: "SET_COLUMNS", columns });
        engine.rebuildRowModel(columns);
        options.sortModel = nextModel;
        engine.dispatchGridEvent("sortChanged", { api: ctx.getApi(), source: "uiColumnSorted" });
      });
    },

    getSortModel() {
      return getSortModel(ctx.getStore().getState().columns);
    },

    setSortModel(
      model: Array<{ colId: string; sort: "asc" | "desc" }>,
      source: "api" | "uiColumnSorted" = "api",
    ): void {
      ctx.getStore().batch(() => {
        const current = getSortModel(ctx.getStore().getState().columns);
        if (sortModelsEqual(current, model)) return;

        const columns = applySortModel(ctx.getStore().getState().columns, model);
        const options = ctx.getOptions() as GridOptions;
        options.sortModel = model;
        engine.getColumnModel().setColumnState(columns);
        ctx.getStore().dispatch({ type: "SET_COLUMNS", columns });
        engine.rebuildRowModel(columns);
        engine.dispatchGridEvent("sortChanged", { api: ctx.getApi(), source });
      });
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
  onGridCreate(ctx) {
    ctx.getEngine().setSortController(createSortController(ctx));
    ctx.registerRowModelStage(createSortStage(ctx));
  },
  onGridDestroy(ctx) {
    ctx.getEngine().setSortController(null);
  },
};

export { compareValues } from "./compare-values.js";
export {
  sortRowNodes,
  sortRowNodesMulti,
  toggleColumnSort,
  applySingleColumnSort,
  applyAdditiveColumnSort,
  toggleColumnSortInColumns,
  applySortModel,
  getSortModel,
} from "./sort.js";

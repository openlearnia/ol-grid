import type { GridContext, GridModule, GridOptions } from "@ol-grid/core";
import { resolveColId } from "@ol-grid/core";
import {
  applyColumnFilters,
  createEmptyFilterModelForType,
  filterModelsEqual,
  isColumnFilterActive,
} from "./apply-column-filters.js";
import type { ColumnFilterModel, FilterModel } from "./types.js";
import { columnHasFilter, resolveFilterType, resolveFloatingFilter } from "./resolve-filter-type.js";

export const FILTER_MODULE_NAME = "FilterModule";

function createColumnFilterStage(): import("@ol-grid/core").RowModelStage {
  return {
    name: "columnFilter",
    order: 100,
    run(rows, ctx) {
      const filterModel = (ctx.filterModel ?? {}) as FilterModel;
      return applyColumnFilters(rows, ctx.columnDefs, filterModel, ctx.api, ctx.context);
    },
  };
}

function normalizeFilterModel(model: FilterModel | null | undefined): FilterModel {
  if (!model) return {};
  return { ...model };
}

export function createFilterController(ctx: GridContext) {
  const engine = ctx.getEngine();

  function getFilterModel(): FilterModel {
    return normalizeFilterModel(ctx.getOptions().filterModel as FilterModel | undefined);
  }

  function setFilterModel(
    model: FilterModel | null,
    source: "api" | "ui" | "floating" | "quickFilter" = "api",
  ): void {
    const next = normalizeFilterModel(model);
    const current = getFilterModel();
    if (filterModelsEqual(current, next)) return;

    const options = ctx.getOptions() as GridOptions;
    options.filterModel = next;
    ctx.getStore().dispatch({ type: "SET_FILTER_MODEL", filterModel: next });
    engine.rebuildRowModel();
    options.onFilterChanged?.({ api: ctx.getApi(), source });
  }

  function destroyFilter(colKey: string): void {
    const current = getFilterModel();
    if (!(colKey in current)) return;
    const next = { ...current };
    delete next[colKey];
    setFilterModel(next, "api");
  }

  function setColumnFilter(
    colId: string,
    model: ColumnFilterModel | null,
    source: "api" | "ui" | "floating" = "ui",
  ): void {
    const current = getFilterModel();
    const next = { ...current };
    if (!model || !isColumnFilterActive(model)) {
      delete next[colId];
    } else {
      next[colId] = model;
    }
    setFilterModel(next, source);
  }

  function openFilter(colId: string): void {
    ctx.getStore().dispatch({ type: "SET_OPEN_FILTER", openFilterColId: colId });
  }

  function closeFilter(): void {
    if (!ctx.getStore().getState().openFilterColId) return;
    ctx.getStore().dispatch({ type: "SET_OPEN_FILTER", openFilterColId: null });
  }

  function getFilterTypeForColumn(colId: string): "text" | "number" | "date" | null {
    const columnDefs = engine.getOptions().columnDefs ?? [];
    const defaultColDef = engine.getOptions().defaultColDef;
    const index = columnDefs.findIndex((def, i) => resolveColId(def, i) === colId);
    if (index < 0) return null;
    const merged = defaultColDef ? { ...defaultColDef, ...columnDefs[index]! } : columnDefs[index]!;
    return resolveFilterType(merged);
  }

  function getDefaultModelForColumn(colId: string): ColumnFilterModel | null {
    const filterType = getFilterTypeForColumn(colId);
    if (!filterType) return null;
    const existing = getFilterModel()[colId];
    return existing ?? createEmptyFilterModelForType(filterType);
  }

  function hasFloatingFilters(): boolean {
    const columnDefs = engine.getOptions().columnDefs ?? [];
    const defaultColDef = engine.getOptions().defaultColDef;
    return columnDefs.some((def, index) => {
      const merged = defaultColDef ? { ...defaultColDef, ...def } : def;
      return resolveFloatingFilter(merged, defaultColDef);
    });
  }

  function isColumnFilterActiveForCol(colId: string): boolean {
    return isColumnFilterActive(getFilterModel()[colId]);
  }

  return {
    getFilterModel,
    setFilterModel,
    destroyFilter,
    setColumnFilter,
    openFilter,
    closeFilter,
    getFilterTypeForColumn,
    getDefaultModelForColumn,
    hasFloatingFilters,
    isColumnFilterActiveForCol,
  };
}

export type FilterController = ReturnType<typeof createFilterController>;

export const FilterModule: GridModule = {
  name: FILTER_MODULE_NAME,
  version: "0.0.0",
  rowModelStages: [createColumnFilterStage()],
  onGridCreate(ctx) {
    const controller = createFilterController(ctx);
    ctx.getEngine().setFilterController(controller);

    const initial = normalizeFilterModel(ctx.getOptions().filterModel as FilterModel | undefined);
    if (Object.keys(initial).length > 0) {
      ctx.getStore().dispatch({ type: "SET_FILTER_MODEL", filterModel: initial });
    }
  },
  onGridDestroy(ctx) {
    ctx.getEngine().setFilterController(null);
  },
};

export {
  applyColumnFilters,
  createEmptyFilterModelForType,
  filterModelsEqual,
  isColumnFilterActive,
  isFilterModelActive,
} from "./apply-column-filters.js";
export { resolveFilterType, columnHasFilter, resolveFloatingFilter } from "./resolve-filter-type.js";
export { getFilterValue } from "./get-filter-value.js";
export { doesTextFilterPass, TEXT_FILTER_OPTIONS, TEXT_FILTER_LABELS } from "./text-filter.js";
export { doesNumberFilterPass, NUMBER_FILTER_OPTIONS, NUMBER_FILTER_LABELS } from "./number-filter.js";
export { doesDateFilterPass, DATE_FILTER_OPTIONS, DATE_FILTER_LABELS } from "./date-filter.js";
export type {
  FilterModel,
  ColumnFilterModel,
  TextFilterModel,
  NumberFilterModel,
  DateFilterModel,
  ProvidedFilterType,
} from "./types.js";

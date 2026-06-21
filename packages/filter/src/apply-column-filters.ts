import type { ColumnDef } from "@ol-grid/core";
import type { RowNode } from "@ol-grid/core";
import { resolveColId } from "@ol-grid/core";
import type { ColumnFilterModel, FilterModel } from "./types.js";
import { doesDateFilterPass } from "./date-filter.js";
import { getFilterValue } from "./get-filter-value.js";
import { doesNumberFilterPass } from "./number-filter.js";
import { columnHasFilter, resolveFilterType } from "./resolve-filter-type.js";
import { doesTextFilterPass } from "./text-filter.js";

export function isColumnFilterActive(model: ColumnFilterModel | undefined): boolean {
  if (!model) return false;

  switch (model.filterType) {
    case "text":
      return model.filter.trim().length > 0;
    case "number":
      if (model.type === "inRange") {
        return model.filter !== null || model.filterTo !== null;
      }
      return model.filter !== null;
    case "date":
      if (model.type === "inRange") {
        return !!model.dateFrom || !!model.dateTo;
      }
      return !!model.dateFrom;
    default:
      return false;
  }
}

export function isFilterModelActive(model: FilterModel): boolean {
  return Object.values(model).some(isColumnFilterActive);
}

function doesColumnFilterPass<TData>(
  node: RowNode<TData>,
  colDef: ColumnDef<TData>,
  model: ColumnFilterModel,
  api: unknown,
  context: unknown,
): boolean {
  const value = getFilterValue(node, colDef, api, context);

  switch (model.filterType) {
    case "text":
      return doesTextFilterPass(value, model);
    case "number":
      return doesNumberFilterPass(value, model);
    case "date":
      return doesDateFilterPass(value, model);
    default:
      return true;
  }
}

export function applyColumnFilters<TData>(
  rows: RowNode<TData>[],
  columnDefs: ColumnDef<TData>[],
  filterModel: FilterModel,
  api: unknown,
  context: unknown,
): RowNode<TData>[] {
  const activeEntries = Object.entries(filterModel).filter(([, model]) =>
    isColumnFilterActive(model),
  );

  if (activeEntries.length === 0) {
    return rows;
  }

  const filterableColumns = columnDefs
    .map((def, index) => ({ def, colId: resolveColId(def, index) }))
    .filter(({ def }) => columnHasFilter(def));

  return rows.filter((node) => {
    for (const [colId, model] of activeEntries) {
      const column = filterableColumns.find((entry) => entry.colId === colId);
      if (!column) continue;
      if (!doesColumnFilterPass(node, column.def, model, api, context)) {
        return false;
      }
    }
    return true;
  });
}

export function createEmptyFilterModelForType(
  filterType: "text" | "number" | "date",
): ColumnFilterModel {
  switch (filterType) {
    case "number":
      return { filterType: "number", type: "equals", filter: null };
    case "date":
      return { filterType: "date", type: "equals", dateFrom: null };
    default:
      return { filterType: "text", type: "contains", filter: "" };
  }
}

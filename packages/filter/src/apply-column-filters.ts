import type { ColumnDef } from "@ol-grid/core";
import type { RowNode } from "@ol-grid/core";
import { resolveColId } from "@ol-grid/core";
import type { ColumnFilterModel, FilterModel } from "./types.js";
import { doesDateFilterPass, DATE_FILTER_OPTIONS } from "./date-filter.js";
import { getFilterValue } from "./get-filter-value.js";
import { doesNumberFilterPass, NUMBER_FILTER_OPTIONS } from "./number-filter.js";
import { columnHasFilter } from "./resolve-filter-type.js";
import { doesTextFilterPass, normalizeFilterText, TEXT_FILTER_OPTIONS } from "./text-filter.js";

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

interface PreparedColumnFilter<TData> {
  def: ColumnDef<TData>;
  model: ColumnFilterModel;
  normalizedTextNeedle?: string;
}

function prepareActiveFilters<TData>(
  filterModel: FilterModel,
  filterableColumns: Array<{ def: ColumnDef<TData>; colId: string }>,
): PreparedColumnFilter<TData>[] {
  const columnById = new Map(filterableColumns.map((entry) => [entry.colId, entry.def]));
  const prepared: PreparedColumnFilter<TData>[] = [];

  for (const [colId, model] of Object.entries(filterModel)) {
    if (!isColumnFilterActive(model)) continue;
    const def = columnById.get(colId);
    if (!def) continue;

    const entry: PreparedColumnFilter<TData> = { def, model };
    if (model.filterType === "text") {
      // Normalize once per filter — rows are scanned in a tight inner loop.
      entry.normalizedTextNeedle = normalizeFilterText(model.filter);
    }
    prepared.push(entry);
  }

  return prepared;
}

function doesPreparedFilterPass<TData>(
  node: RowNode<TData>,
  prepared: PreparedColumnFilter<TData>,
  api: unknown,
  context: unknown,
): boolean {
  const value = getFilterValue(node, prepared.def, api, context);

  switch (prepared.model.filterType) {
    case "text":
      return doesTextFilterPass(value, prepared.model, prepared.normalizedTextNeedle);
    case "number":
      return doesNumberFilterPass(value, prepared.model);
    case "date":
      return doesDateFilterPass(value, prepared.model);
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
  const activeFilters = prepareActiveFilters(
    filterModel,
    columnDefs
      .map((def, index) => ({ def, colId: resolveColId(def, index) }))
      .filter(({ def }) => columnHasFilter(def)),
  );

  if (activeFilters.length === 0) {
    return rows;
  }

  // AND across columns — row must pass every active column filter.
  const result: RowNode<TData>[] = [];
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const node = rows[rowIndex]!;
    let passes = true;
    for (let filterIndex = 0; filterIndex < activeFilters.length; filterIndex++) {
      if (!doesPreparedFilterPass(node, activeFilters[filterIndex]!, api, context)) {
        passes = false;
        break;
      }
    }
    if (passes) {
      result.push(node);
    }
  }
  return result;
}

export function createEmptyFilterModelForType(
  filterType: "text" | "number" | "date",
  defaultOption?: string,
): ColumnFilterModel {
  switch (filterType) {
    case "number": {
      const type =
        defaultOption && (NUMBER_FILTER_OPTIONS as readonly string[]).includes(defaultOption)
          ? (defaultOption as import("./types.js").NumberFilterModel["type"])
          : "equals";
      return { filterType: "number", type, filter: null };
    }
    case "date": {
      const type =
        defaultOption && (DATE_FILTER_OPTIONS as readonly string[]).includes(defaultOption)
          ? (defaultOption as import("./types.js").DateFilterModel["type"])
          : "equals";
      return { filterType: "date", type, dateFrom: null };
    }
    default: {
      const type =
        defaultOption && (TEXT_FILTER_OPTIONS as readonly string[]).includes(defaultOption)
          ? (defaultOption as import("./types.js").TextFilterModel["type"])
          : "contains";
      return { filterType: "text", type, filter: "" };
    }
  }
}

export function filterModelsEqual(left: FilterModel, right: FilterModel): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  for (const key of leftKeys) {
    if (!Object.prototype.hasOwnProperty.call(right, key)) return false;
    if (JSON.stringify(left[key]) !== JSON.stringify(right[key])) return false;
  }
  return true;
}

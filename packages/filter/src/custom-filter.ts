import type { ColumnDef } from "@ol-grid/core";
import type {
  CustomFilterModel,
  CustomFilterRegistration,
  DoesFilterPassParams,
  FilterComponent,
  FilterComponentFactory,
} from "@ol-grid/core";
import type { RowNode } from "@ol-grid/core";

const PROVIDED_FILTER_TYPES = new Set(["text", "number", "date"]);

export function isProvidedFilterType(value: string): value is "text" | "number" | "date" {
  return PROVIDED_FILTER_TYPES.has(value);
}

export interface CustomFilterSource<TData = unknown> {
  key?: string;
  factory?: FilterComponentFactory<TData>;
}

/** Resolve custom filter registry key or inline factory from a column def. */
export function resolveCustomFilterSource<TData>(
  colDef: ColumnDef<TData>,
): CustomFilterSource<TData> | null {
  const filter = colDef.filter;
  if (typeof filter === "function") {
    return { factory: filter as FilterComponentFactory<TData> };
  }
  if (typeof filter === "string" && !isProvidedFilterType(filter)) {
    return { key: filter };
  }
  return null;
}

export function isCustomFilterModel(model: unknown): model is CustomFilterModel {
  return (
    !!model &&
    typeof model === "object" &&
    (model as CustomFilterModel).filterType === "custom"
  );
}

/** True when the custom model carries any non-empty filter state. */
export function isCustomFilterModelActive(model: CustomFilterModel | undefined): boolean {
  if (!model) return false;
  for (const [key, value] of Object.entries(model)) {
    if (key === "filterType") continue;
    if (Array.isArray(value)) return value.length > 0;
    if (value != null && value !== "") return true;
  }
  return false;
}

export function createEmptyCustomFilterModel(): CustomFilterModel {
  return { filterType: "custom" };
}

function createFilterComponent<TData>(
  source: CustomFilterSource<TData>,
  registry: ReadonlyMap<string, CustomFilterRegistration<TData>> | undefined,
  model: CustomFilterModel,
  colDef: ColumnDef<TData>,
  colId: string,
  api: unknown,
  context: unknown,
): FilterComponent<TData> | null {
  const factory =
    source.factory ??
    (source.key ? registry?.get(source.key)?.create : undefined);
  if (!factory) return null;

  let currentModel: CustomFilterModel | null = model;
  const params = {
    colDef,
    colId,
    api,
    context,
    filterParams: colDef.filterParams,
    filterChangedCallback: () => {},
    getModel: () => currentModel,
    setModel: (next: CustomFilterModel | null) => {
      currentModel = next;
    },
  };

  const component = factory(params);
  component.init(params);
  component.setModel(model);
  return component;
}

export function doesCustomFilterPass<TData>(
  node: RowNode<TData>,
  model: CustomFilterModel,
  source: CustomFilterSource<TData>,
  registry: ReadonlyMap<string, CustomFilterRegistration<TData>> | undefined,
  colDef: ColumnDef<TData>,
  colId: string,
  api: unknown,
  context: unknown,
): boolean {
  const component = createFilterComponent(
    source,
    registry,
    model,
    colDef,
    colId,
    api,
    context,
  );
  if (!component) return true;

  const params: DoesFilterPassParams<TData> = {
    node,
    data: node.data as TData,
    filterModel: model,
  };
  return component.doesFilterPass(params);
}

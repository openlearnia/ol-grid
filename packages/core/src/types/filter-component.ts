import type { ColumnDef } from "./column.js";
import type { RowNode } from "./row.js";

/** Serializable model for custom column filters (`filterType: "custom"`). */
export interface CustomFilterModel {
  filterType: "custom";
  [key: string]: unknown;
}

export interface DoesFilterPassParams<TData = unknown> {
  node: RowNode<TData>;
  data: TData;
  filterModel: CustomFilterModel;
}

export interface FilterDisplayParams<TData = unknown> {
  colDef: ColumnDef<TData>;
  colId: string;
  api: unknown;
  context: unknown;
  filterParams?: Record<string, unknown>;
  filterChangedCallback: () => void;
  getModel: () => CustomFilterModel | null;
  setModel: (model: CustomFilterModel | null) => void;
}

export interface FilterComponent<TData = unknown> {
  init(params: FilterDisplayParams<TData>): void;
  getGui(): HTMLElement;
  getModel(): CustomFilterModel | null;
  setModel(model: CustomFilterModel | null): void;
  isFilterActive(): boolean;
  doesFilterPass(params: DoesFilterPassParams<TData>): boolean;
  destroy?(): void;
}

export type FilterComponentFactory<TData = unknown> = (
  params: FilterDisplayParams<TData>,
) => FilterComponent<TData>;

export interface CustomFilterRegistration<TData = unknown> {
  create: FilterComponentFactory<TData>;
}

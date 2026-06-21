import type { FilterModel } from "./types";

declare module "@ol-grid/core" {
  interface GridApi<TData = unknown> {
    setFilterModel(model: FilterModel | null): void;
    getFilterModel(): FilterModel;
    destroyFilter(colKey: string): void;
  }

  interface GridOptions<TData = unknown> {
    filterModel?: FilterModel;
  }
}

export {};

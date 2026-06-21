import {
  createGridEngine,
  ModuleRegistry,
  type GridApi,
  type GridEngine,
  type GridOptions,
} from "@ol-grid/core";
import { SortModule } from "@ol-grid/sort";
import { FilterModule } from "@ol-grid/filter";
import { createDomRenderer } from "@ol-grid/dom-renderer";

let sortModuleRegistered = false;
let filterModuleRegistered = false;

function ensureSortModuleRegistered(): void {
  if (sortModuleRegistered) return;
  ModuleRegistry.register(SortModule);
  sortModuleRegistered = true;
}

function ensureFilterModuleRegistered(): void {
  if (filterModuleRegistered) return;
  ModuleRegistry.register(FilterModule);
  filterModuleRegistered = true;
}

export interface GridInstance<TData = unknown> {
  engine: GridEngine<TData>;
  api: GridApi<TData>;
  destroy(): void;
}

export function createGrid<TData>(
  host: HTMLElement,
  options: GridOptions<TData> = {},
): GridInstance<TData> {
  ensureSortModuleRegistered();
  ensureFilterModuleRegistered();
  const engine = createGridEngine({
    ...options,
    modules: [...(options.modules ?? []), SortModule, FilterModule],
  });
  const renderer = createDomRenderer();

  engine.mount(host, renderer);

  return {
    engine,
    api: engine.getApi(),
    destroy() {
      engine.destroy();
    },
  };
}

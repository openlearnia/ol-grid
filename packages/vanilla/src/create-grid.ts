import {
  createGridEngine,
  ModuleRegistry,
  type GridApi,
  type GridEngine,
  type GridOptions,
} from "@ol-grid/core";
import { SortModule } from "@ol-grid/sort";
import { FilterModule } from "@ol-grid/filter";
import { InfiniteRowModelModule } from "@ol-grid/infinite-row-model";
import { createDomRenderer } from "@ol-grid/dom-renderer";

let sortModuleRegistered = false;
let filterModuleRegistered = false;
let infiniteModuleRegistered = false;

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

function ensureInfiniteModuleRegistered(): void {
  if (infiniteModuleRegistered) return;
  ModuleRegistry.register(InfiniteRowModelModule);
  infiniteModuleRegistered = true;
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
  if (options.rowModelType === "infinite") {
    ensureInfiniteModuleRegistered();
  }

  const defaultModules = [SortModule, FilterModule];
  // Infinite row model is opt-in — only register when rowModelType demands it.
  if (options.rowModelType === "infinite") {
    defaultModules.push(InfiniteRowModelModule);
  }

  const engine = createGridEngine({
    ...options,
    modules: [...(options.modules ?? []), ...defaultModules],
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

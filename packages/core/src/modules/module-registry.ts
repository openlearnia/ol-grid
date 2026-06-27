import type { GridContext } from "./grid-context.js";

export interface RowModelStage {
  name: string;
  order: number;
  run: (
    rows: import("../types/row.js").RowNode[],
    ctx: RowModelStageContext,
  ) => import("../types/row.js").RowNode[];
}

export interface RowModelStageContext {
  columnDefs: import("../types/column.js").ColumnDef[];
  api: unknown;
  context: unknown;
  sortModel: Array<{ colId: string; sort: "asc" | "desc" }>;
  filterModel: Record<string, unknown>;
  customFilterRegistry?: ReadonlyMap<
    string,
    import("../types/filter-component.js").CustomFilterRegistration
  >;
  pagination?: {
    enabled: boolean;
    page: number;
    pageSize: number;
  };
}

export interface GridModule {
  name: string;
  version: string;
  dependencies?: string[];
  onRegister?(registry: typeof ModuleRegistry): void;
  onGridCreate?(ctx: GridContext): void;
  onGridDestroy?(ctx: GridContext): void;
  storeSlices?: Record<string, unknown>;
  rowModelStages?: RowModelStage[];
  apiExtensions?: Record<string, (...args: unknown[]) => unknown>;
  eventTypes?: string[];
}

const globalRegistry = new Map<string, GridModule>();

/** Dependency-first ordering; throws on cycles or missing deps. */
function topologicalSort(modules: GridModule[]): GridModule[] {
  const byName = new Map(modules.map((mod) => [mod.name, mod]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const sorted: GridModule[] = [];

  function visit(mod: GridModule): void {
    if (visited.has(mod.name)) return;
    if (visiting.has(mod.name)) {
      throw new Error(`Circular module dependency detected: ${mod.name}`);
    }
    visiting.add(mod.name);
    for (const dep of mod.dependencies ?? []) {
      const depMod = byName.get(dep);
      if (!depMod) {
        throw new Error(`Module "${mod.name}" depends on missing module "${dep}"`);
      }
      visit(depMod);
    }
    visiting.delete(mod.name);
    visited.add(mod.name);
    sorted.push(mod);
  }

  for (const mod of modules) {
    visit(mod);
  }
  return sorted;
}

function mergeModules(global: GridModule[], perGrid: GridModule[] = []): GridModule[] {
  const merged = new Map<string, GridModule>();
  for (const mod of global) {
    merged.set(mod.name, mod);
  }
  for (const mod of perGrid) {
    // Global ModuleRegistry.register() wins over per-grid duplicates.
    if (merged.has(mod.name)) {
      if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
        console.warn(`[ol-grid] Module "${mod.name}" already registered globally — keeping global instance`);
      }
      continue;
    }
    merged.set(mod.name, mod);
  }
  return topologicalSort([...merged.values()]);
}

export const ModuleRegistry = {
  register(...modules: GridModule[]): void {
    for (const mod of modules) {
      if (globalRegistry.has(mod.name)) {
        if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
          console.warn(`[ol-grid] Module "${mod.name}" already registered — skipping`);
        }
        continue;
      }
      globalRegistry.set(mod.name, mod);
      mod.onRegister?.(ModuleRegistry);
    }
  },

  registerModules(...modules: GridModule[]): void {
    ModuleRegistry.register(...modules);
  },

  get(name: string): GridModule | undefined {
    return globalRegistry.get(name);
  },

  getModule(name: string): GridModule | undefined {
    return globalRegistry.get(name);
  },

  has(name: string): boolean {
    return globalRegistry.has(name);
  },

  resolve(perGridModules: GridModule[] = []): GridModule[] {
    return mergeModules([...globalRegistry.values()], perGridModules);
  },

  clear(): void {
    globalRegistry.clear();
  },

  reset(): void {
    globalRegistry.clear();
  },
};

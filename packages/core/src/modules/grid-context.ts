import type { GridEngine } from "../engine/grid-engine.js";
import type { CellRendererFn } from "../types/cell-renderer.js";
import type { GridOptions } from "../types/options.js";
import type { RendererAdapter } from "../types/renderer.js";
import type { GridStore } from "../store/grid-store.js";
import type { GridApi } from "../types/api.js";
import type { RowModelStage } from "./module-registry.js";

export interface GridContext {
  getStore(): GridStore;
  getApi(): GridApi;
  getOptions(): Readonly<GridOptions>;
  getRenderer(): RendererAdapter | null;
  getEngine(): GridEngine<unknown>;
  registerCellRenderer(name: string, renderer: CellRendererFn): void;
  registerRowModelStage(stage: RowModelStage): void;
}

export function createGridContext(
  engine: GridEngine<unknown>,
  registerCellRenderer: (name: string, renderer: CellRendererFn) => void,
  registerRowModelStage: (stage: RowModelStage) => void,
): GridContext {
  return {
    getStore: () => engine.getStore(),
    getApi: () => engine.getApi(),
    getOptions: () => engine.getOptions(),
    getRenderer: () => engine.getRenderer(),
    getEngine: () => engine,
    registerCellRenderer,
    registerRowModelStage,
  };
}

import type { GridContext, GridModule, GridOptions } from "@ol-grid/core";
import { InfiniteRowModel } from "./infinite-row-model.js";

export const INFINITE_ROW_MODEL_MODULE_NAME = "InfiniteRowModelModule";

export function createInfiniteRowModelController(ctx: GridContext) {
  const engine = ctx.getEngine();
  const options = ctx.getOptions() as GridOptions;
  let model: InfiniteRowModel | null = null;

  function isActive(): boolean {
    return options.rowModelType === "infinite";
  }

  function ensureModel(): InfiniteRowModel | null {
    if (!isActive()) return null;
    if (model) return model;

    const datasource = options.datasource;
    if (!datasource) {
      console.warn("[ol-grid] infinite row model requires a datasource");
      return null;
    }

    model = new InfiniteRowModel({
      datasource,
      getRowId: options.getRowId ?? (({ index }) => String(index)),
      cacheBlockSize: options.cacheBlockSize,
      maxBlocksInCache: options.maxBlocksInCache,
      infiniteInitialRowCount: options.infiniteInitialRowCount,
      context: options.context ?? null,
    });

    model.setCallbacks({
      onRowCountChanged(rowCount) {
        ctx.getStore().dispatch({ type: "SET_ROW_COUNT", rowCount });
      },
      onMetaChanged(meta) {
        ctx.getStore().dispatch({
          type: "SET_ROW_MODEL_META",
          rowModelMeta: {
            loading: meta.loading,
            error: meta.error,
            failedBlocks: meta.failedBlocks,
          },
        });
      },
      onBlocksLoaded() {
        ctx.getStore().dispatch({ type: "BUMP_ROW_DATA_VERSION" });
      },
    });

    engine.setInfiniteRowModel(model);
    ctx.getStore().dispatch({ type: "SET_ROW_MODEL_TYPE", rowModelType: "infinite" });
    ctx.getStore().dispatch({
      type: "SET_ROW_COUNT",
      rowCount: model.getRowCount(),
    });

    return model;
  }

  return {
    init() {
      const activeModel = ensureModel();
      if (!activeModel) return;
      activeModel.ensureRangeLoaded(0, options.cacheBlockSize ?? 100);
    },

    getModel() {
      return model;
    },

    onSortOrFilterChanged(
      sortModel: Array<{ colId: string; sort: "asc" | "desc" }>,
      filterModel: Record<string, unknown>,
      quickFilterText: string,
    ) {
      if (!model) return;
      model.onSortOrFilterChanged(sortModel, filterModel, quickFilterText);
      const blockSize = options.cacheBlockSize ?? 100;
      model.ensureRangeLoaded(0, blockSize);
    },

    ensureRangeLoaded(startRow: number, endRow: number) {
      model?.ensureRangeLoaded(startRow, endRow);
    },

    refreshInfiniteCache() {
      model?.refreshCache();
    },

    purgeInfiniteCache() {
      model?.purgeCache();
    },

    getInfiniteRowCount() {
      return model?.getRowCount() ?? 0;
    },

    isLastRowIndexKnown() {
      return model?.isLastRowIndexKnown() ?? false;
    },

    destroy() {
      model?.destroy();
      model = null;
      engine.setInfiniteRowModel(null);
    },
  };
}

export type InfiniteRowModelController = ReturnType<typeof createInfiniteRowModelController>;

export const InfiniteRowModelModule: GridModule = {
  name: INFINITE_ROW_MODEL_MODULE_NAME,
  version: "0.0.0",
  onGridCreate(ctx) {
    const options = ctx.getOptions();
    if (options.rowModelType !== "infinite") return;

    if (options.rowData?.length) {
      console.warn("[ol-grid] rowData is ignored when rowModelType is 'infinite'");
    }

    const controller = createInfiniteRowModelController(ctx);
    ctx.getEngine().setInfiniteRowModelController(controller);
    controller.init();
  },
  onGridDestroy(ctx) {
    ctx.getEngine().getInfiniteRowModelController()?.destroy();
    ctx.getEngine().setInfiniteRowModelController(null);
  },
};

export { InfiniteRowModel } from "./infinite-row-model.js";

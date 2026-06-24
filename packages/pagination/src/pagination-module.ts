import type { GridContext, GridModule, GridOptions } from "@ol-grid/core";
import type { PaginationState } from "@ol-grid/core";
import {
  clampPage,
  computeTotalPages,
  normalizePageSize,
  slicePageRows,
} from "./pagination.js";

export const PAGINATION_MODULE_NAME = "PaginationModule";

const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE_SELECTOR = [20, 50, 100];

interface PaginationRuntime {
  enabled: boolean;
  page: number;
  pageSize: number;
  totalRows: number;
}

function readPageSize(options: GridOptions): number {
  return normalizePageSize(options.paginationPageSize ?? DEFAULT_PAGE_SIZE);
}

function readPageSizeSelector(options: GridOptions): number[] {
  const selector = options.paginationPageSizeSelector ?? DEFAULT_PAGE_SIZE_SELECTOR;
  return selector.map(normalizePageSize);
}

function toStoreState(runtime: PaginationRuntime): PaginationState {
  return {
    page: runtime.page,
    pageSize: runtime.pageSize,
    totalRows: runtime.totalRows,
    totalPages: computeTotalPages(runtime.totalRows, runtime.pageSize),
  };
}

function createPaginationStage(runtime: PaginationRuntime): import("@ol-grid/core").RowModelStage {
  return {
    name: "pagination",
    order: 300,
    run(rows, ctx) {
      if (!ctx.pagination?.enabled) {
        runtime.totalRows = rows.length;
        return rows;
      }

      runtime.totalRows = rows.length;
      const totalPages = computeTotalPages(rows.length, ctx.pagination.pageSize);
      runtime.page = clampPage(ctx.pagination.page, totalPages);
      return slicePageRows(rows, runtime.page, ctx.pagination.pageSize);
    },
  };
}

export function createPaginationController(ctx: GridContext, runtime: PaginationRuntime) {
  const engine = ctx.getEngine();
  const options = ctx.getOptions() as GridOptions;
  let suppressPageReset = false;

  function getStageContext(): { enabled: boolean; page: number; pageSize: number } {
    return {
      enabled: runtime.enabled,
      page: runtime.page,
      pageSize: runtime.pageSize,
    };
  }

  function syncStore(): void {
    if (!runtime.enabled) {
      ctx.getStore().dispatch({ type: "SET_PAGINATION", pagination: undefined });
      return;
    }
    ctx.getStore().dispatch({ type: "SET_PAGINATION", pagination: toStoreState(runtime) });
  }

  function emitPaginationChanged(): void {
    engine.dispatchGridEvent("paginationChanged", {
      api: ctx.getApi(),
      newPage: runtime.page,
      newPageSize: runtime.pageSize,
    });
  }

  function rebuildWithContext(): void {
    engine.getRowModel().setPaginationContext(getStageContext());
    engine.rebuildRowModel();
    syncStore();
  }

  function rebuildForPaginationChange(): void {
    suppressPageReset = true;
    try {
      rebuildWithContext();
    } finally {
      suppressPageReset = false;
    }
  }

  function applyPage(page: number, emit = true): void {
    if (!runtime.enabled) return;
    const totalPages = computeTotalPages(runtime.totalRows, runtime.pageSize);
    const nextPage = clampPage(page, totalPages);
    if (nextPage === runtime.page) {
      if (emit) return;
    }

    runtime.page = nextPage;
    options.paginationPage = nextPage;
    rebuildForPaginationChange();
    if (emit) emitPaginationChanged();
  }

  function applyPageSize(pageSize: number, emit = true): void {
    if (!runtime.enabled) return;
    const nextSize = normalizePageSize(pageSize);
    const changed = nextSize !== runtime.pageSize || runtime.page !== 0;
    if (!changed && emit) return;

    runtime.pageSize = nextSize;
    runtime.page = 0;
    options.paginationPageSize = nextSize;
    options.paginationPage = 0;
    rebuildForPaginationChange();
    if (emit) emitPaginationChanged();
  }

  function resetPageIfNeeded(): void {
    if (!runtime.enabled || options.suppressPaginationOnFilter) return;
    if (runtime.page === 0) return;
    runtime.page = 0;
    options.paginationPage = 0;
    engine.getRowModel().setPaginationContext(getStageContext());
  }

  return {
    init() {
      if (options.rowModelType === "infinite" && options.pagination) {
        console.warn("[ol-grid] pagination is ignored when rowModelType is 'infinite'");
        runtime.enabled = false;
        return;
      }

      engine.getRowModel().setPaginationContext(getStageContext());
      syncStore();
    },

    beforeRowModelRebuild() {
      if (suppressPageReset) return;
      resetPageIfNeeded();
    },

    onRowModelRebuilt() {
      syncStore();
    },

    isEnabled() {
      return runtime.enabled;
    },

    getStageContext,

    paginationGetCurrentPage() {
      return runtime.page;
    },

    paginationGetTotalPages() {
      return computeTotalPages(runtime.totalRows, runtime.pageSize);
    },

    paginationGetPageSize() {
      return runtime.pageSize;
    },

    paginationGoToPage(page: number) {
      applyPage(page);
    },

    paginationGoToFirstPage() {
      applyPage(0);
    },

    paginationGoToLastPage() {
      applyPage(computeTotalPages(runtime.totalRows, runtime.pageSize) - 1);
    },

    paginationGoToNextPage() {
      applyPage(runtime.page + 1);
    },

    paginationGoToPreviousPage() {
      applyPage(runtime.page - 1);
    },

    paginationSetPageSize(size: number) {
      applyPageSize(size);
    },

    getPageSizeSelector() {
      return readPageSizeSelector(options);
    },

    shouldSuppressPanel() {
      return options.suppressPaginationPanel === true;
    },
  };
}

export type PaginationController = ReturnType<typeof createPaginationController>;

export const PaginationModule: GridModule = {
  name: PAGINATION_MODULE_NAME,
  version: "0.0.0",
  onGridCreate(ctx) {
    const options = ctx.getOptions();
    if (!options.pagination) return;

    const runtime: PaginationRuntime = {
      enabled: true,
      page: options.paginationPage ?? 0,
      pageSize: readPageSize(options),
      totalRows: 0,
    };

    const controller = createPaginationController(ctx, runtime);
    ctx.registerRowModelStage(createPaginationStage(runtime));
    ctx.getEngine().setPaginationController(controller);
    controller.init();
  },
  onGridDestroy(ctx) {
    ctx.getEngine().setPaginationController(null);
  },
};

export {
  computeTotalPages,
  clampPage,
  slicePageRows,
  normalizePageSize,
} from "./pagination.js";

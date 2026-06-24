import type { GridContext, GridModule, GridOptions } from "@ol-grid/core";
import type { PaginationState } from "@ol-grid/core";
import type { Unsubscribe } from "@ol-grid/core";
import {
  clampPage,
  computeAutoPageSize,
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
  storeUnsubscribe: Unsubscribe | null;
}

function readPageSize(options: GridOptions, ctx: GridContext): number {
  if (options.paginationAutoPageSize) {
    const viewportHeight = ctx.getStore().getState().viewportHeight;
    const rowHeight = ctx.getEngine().getRowHeight();
    return computeAutoPageSize(viewportHeight, rowHeight);
  }
  return normalizePageSize(options.paginationPageSize ?? DEFAULT_PAGE_SIZE);
}

function readPageSizeSelector(options: GridOptions): number[] {
  if (options.paginationAutoPageSize) return [];
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
    // Runs after sort (200) so page slices the fully ordered row set.
    order: 300,
    run(rows, ctx) {
      if (!ctx.pagination?.enabled) {
        runtime.totalRows = rows.length;
        return rows;
      }

      runtime.totalRows = rows.length;
      const totalPages = computeTotalPages(rows.length, ctx.pagination.pageSize);
      // Clamp when filter shrinks row count below the current page.
      runtime.page = clampPage(ctx.pagination.page, totalPages);
      return slicePageRows(rows, runtime.page, ctx.pagination.pageSize);
    },
  };
}

export function createPaginationController(ctx: GridContext, runtime: PaginationRuntime) {
  const engine = ctx.getEngine();
  const options = ctx.getOptions() as GridOptions;
  // Guard: pagination-driven rebuilds must not reset page back to 0 mid-flight.
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
    // Filter/sort/quick-filter rebuilds jump to first page unless opted out.
    runtime.page = 0;
    options.paginationPage = 0;
    engine.getRowModel().setPaginationContext(getStageContext());
  }

  function applyAutoPageSizeFromViewport(viewportHeight: number, emit = true): void {
    if (!options.paginationAutoPageSize || !runtime.enabled) return;
    const nextSize = computeAutoPageSize(viewportHeight, ctx.getEngine().getRowHeight());
    if (nextSize === runtime.pageSize) return;

    runtime.pageSize = nextSize;
    options.paginationPageSize = nextSize;
    const totalPages = computeTotalPages(runtime.totalRows, nextSize);
    runtime.page = clampPage(runtime.page, totalPages);
    options.paginationPage = runtime.page;
    rebuildForPaginationChange();
    if (emit) emitPaginationChanged();
  }

  return {
    init() {
      if (options.rowModelType === "infinite" && options.pagination) {
        // Infinite model pages at the datasource; client pagination would double-slice.
        console.warn("[ol-grid] pagination is ignored when rowModelType is 'infinite'");
        runtime.enabled = false;
        return;
      }

      engine.getRowModel().setPaginationContext(getStageContext());
      syncStore();

      if (options.paginationAutoPageSize) {
        runtime.storeUnsubscribe = ctx.getStore().subscribe(() => {
          const { viewportHeight } = ctx.getStore().getState();
          if (viewportHeight <= 0) return;
          applyAutoPageSizeFromViewport(viewportHeight);
        });
        const { viewportHeight } = ctx.getStore().getState();
        if (viewportHeight > 0) {
          applyAutoPageSizeFromViewport(viewportHeight, false);
        }
      }
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

    isAutoPageSize() {
      return options.paginationAutoPageSize === true;
    },

    destroy() {
      runtime.storeUnsubscribe?.();
      runtime.storeUnsubscribe = null;
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
      pageSize: readPageSize(options, ctx),
      totalRows: 0,
      storeUnsubscribe: null,
    };

    const controller = createPaginationController(ctx, runtime);
    ctx.registerRowModelStage(createPaginationStage(runtime));
    ctx.getEngine().setPaginationController(controller);
    controller.init();
  },
  onGridDestroy(ctx) {
    ctx.getEngine().getPaginationController()?.destroy?.();
    ctx.getEngine().setPaginationController(null);
  },
};

export {
  computeAutoPageSize,
  computeTotalPages,
  clampPage,
  slicePageRows,
  normalizePageSize,
} from "./pagination.js";

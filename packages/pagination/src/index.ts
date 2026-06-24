/**
 * @packageDocumentation
 * Client-side pagination pipeline stage and footer panel.
 * @module @ol-grid/pagination
 */
export {
  PaginationModule,
  PAGINATION_MODULE_NAME,
  createPaginationController,
} from "./pagination-module.js";
export {
  computeTotalPages,
  clampPage,
  slicePageRows,
  normalizePageSize,
} from "./pagination.js";

import type { ColumnDef, ColumnState } from "../types/column.js";
import { flattenColumnDefs } from "./flatten-column-defs.js";

const DEFAULT_WIDTH = 150;
const MIN_WIDTH = 50;

export interface NormalizedColumn<TData = unknown> {
  colId: string;
  def: ColumnDef<TData>;
  index: number;
  width: number;
  left: number;
  pinned: "left" | "right" | null;
  sort: "asc" | "desc" | null;
  sortIndex: number | null;
  isSelectionColumn?: boolean;
}

export const SELECTION_COLUMN_ID = "__selection__";
export const SELECTION_COLUMN_WIDTH = 40;

export class ColumnModel<TData = unknown> {
  private columnDefs: ColumnDef<TData>[] = [];
  private columnState: ColumnState[] = [];
  private viewportWidth = 0;
  private columns: NormalizedColumn<TData>[] = [];
  private pinnedLeftColumns: NormalizedColumn<TData>[] = [];
  private centerColumns: NormalizedColumn<TData>[] = [];
  private pinnedRightColumns: NormalizedColumn<TData>[] = [];
  private totalWidth = 0;
  /** Outer grid width: viewport when columns overflow, else column sum. */
  private renderWidth = 0;
  private pinnedLeftWidth = 0;
  private centerWidth = 0;
  private centerViewportWidth = 0;
  private pinnedRightWidth = 0;
  private includeSelectionColumn = false;

  setColumnDefs(columnDefs: ColumnDef<TData>[]): void {
    this.columnDefs = columnDefs;
    this.rebuild();
  }

  setColumnState(columnState: ColumnState[]): void {
    this.columnState = columnState;
    this.rebuild();
  }

  setViewportWidth(width: number): void {
    if (this.viewportWidth === width) return;
    this.viewportWidth = width;
    this.rebuild();
  }

  setIncludeSelectionColumn(include: boolean): void {
    if (this.includeSelectionColumn === include) return;
    this.includeSelectionColumn = include;
    this.rebuild();
  }

  getColumns(): readonly NormalizedColumn<TData>[] {
    return this.columns;
  }

  getPinnedLeftColumns(): readonly NormalizedColumn<TData>[] {
    return this.pinnedLeftColumns;
  }

  getCenterColumns(): readonly NormalizedColumn<TData>[] {
    return this.centerColumns;
  }

  getPinnedRightColumns(): readonly NormalizedColumn<TData>[] {
    return this.pinnedRightColumns;
  }

  getPinnedLeftWidth(): number {
    return this.pinnedLeftWidth;
  }

  getCenterWidth(): number {
    return this.centerWidth;
  }

  /** Visible width of the center scroll viewport (grid width minus pinned regions). */
  getCenterViewportWidth(): number {
    return this.centerViewportWidth;
  }

  getPinnedRightWidth(): number {
    return this.pinnedRightWidth;
  }

  getTotalWidth(): number {
    return this.totalWidth;
  }

  /** Visible grid width: viewport when total column width exceeds it, else total column width. */
  getRenderWidth(): number {
    return this.renderWidth;
  }

  getByColId(colId: string): NormalizedColumn<TData> | undefined {
    return this.columns.find((col) => col.colId === colId);
  }

  setColumnWidth(colId: string, width: number): ColumnState[] {
    const column = this.getByColId(colId);
    if (!column || column.isSelectionColumn) return this.columnState;

    const minWidth = column.def.minWidth ?? MIN_WIDTH;
    const maxWidth = column.def.maxWidth;
    let nextWidth = Math.max(minWidth, Math.round(width));
    if (maxWidth !== undefined) {
      nextWidth = Math.min(nextWidth, maxWidth);
    }

    this.columnState = this.columnState.map((state) =>
      state.colId === colId ? { ...state, width: nextWidth } : state,
    );
    this.rebuild();
    return this.columnState;
  }

  getColumnState(): ColumnState[] {
    return this.columnState;
  }

  sizeColumnsToFit(viewportWidth?: number): ColumnState[] {
    const vp = viewportWidth ?? this.viewportWidth;
    if (vp <= 0) return this.columnState;

    const centerColIds = this.centerColumns
      .filter((col) => !col.def.flex && col.def.suppressSizeToFit !== true)
      .map((col) => col.colId);

    if (centerColIds.length === 0) return this.columnState;

    const pinnedLeftWidth = this.pinnedLeftColumns.reduce((sum, col) => sum + col.width, 0);
    const pinnedRightWidth = this.pinnedRightColumns.reduce((sum, col) => sum + col.width, 0);
    const available = Math.max(0, vp - pinnedLeftWidth - pinnedRightWidth);

    const currentTotal = centerColIds.reduce((sum, colId) => {
      const col = this.getByColId(colId);
      return sum + (col?.width ?? DEFAULT_WIDTH);
    }, 0);

    if (currentTotal <= 0) return this.columnState;

    const scale = available / currentTotal;
    const stateByColId = new Map(this.columnState.map((state) => [state.colId, state]));

    this.columnState = this.columns
      .filter((col) => !col.isSelectionColumn)
      .map((column) => {
        const existing = stateByColId.get(column.colId);
        const base: ColumnState = existing ?? {
          colId: column.colId,
          width: column.width,
          pinned: column.pinned,
          sort: column.sort,
          sortIndex: column.sortIndex,
        };

        if (!centerColIds.includes(column.colId)) return base;

        const minWidth = column.def.minWidth ?? MIN_WIDTH;
        const maxWidth = column.def.maxWidth;
        let nextWidth = Math.max(minWidth, Math.round(column.width * scale));
        if (maxWidth !== undefined) {
          nextWidth = Math.min(nextWidth, maxWidth);
        }
        return { ...base, width: nextWidth };
      });

    this.rebuild();
    return this.columnState;
  }

  private rebuild(): void {
    const flat = flattenColumnDefs(this.columnDefs);
    const entries = flat
      .map(({ def, colId, leafIndex }) => {
        const state = this.columnState.find((col) => col.colId === colId);
        return { def, index: leafIndex, colId, state };
      })
      .filter(({ def }) => !def.hide);

    const getPinned = (entry: (typeof entries)[number]) =>
      entry.state?.pinned ?? entry.def.pinned ?? null;

    const pinnedLeftEntries = entries.filter((entry) => getPinned(entry) === "left");
    const pinnedRightEntries = entries.filter((entry) => getPinned(entry) === "right");
    const centerEntries = entries.filter((entry) => {
      const pinned = getPinned(entry);
      return pinned !== "left" && pinned !== "right";
    });

    const pinnedLeftWidths = this.computeWidths(pinnedLeftEntries, 0);
    const pinnedRightWidths = this.computeWidths(pinnedRightEntries, 0);

    const baseColumns = entries.map((entry) => {
      const pinned = getPinned(entry);
      let width = DEFAULT_WIDTH;
      if (pinned === "left") {
        const i = pinnedLeftEntries.indexOf(entry);
        width = pinnedLeftWidths[i] ?? DEFAULT_WIDTH;
      } else if (pinned === "right") {
        const i = pinnedRightEntries.indexOf(entry);
        width = pinnedRightWidths[i] ?? DEFAULT_WIDTH;
      }
      return {
        colId: entry.colId,
        def: entry.def,
        index: entry.index,
        width,
        left: 0,
        pinned,
        sort: entry.state?.sort ?? null,
        sortIndex: entry.state?.sortIndex ?? null,
      } satisfies NormalizedColumn<TData>;
    });

    const selectionColumn: NormalizedColumn<TData> | null = this.includeSelectionColumn
      ? {
          colId: SELECTION_COLUMN_ID,
          def: {
            id: SELECTION_COLUMN_ID,
            headerName: "",
            width: SELECTION_COLUMN_WIDTH,
            pinned: "left",
            sortable: false,
          },
          index: -1,
          width: SELECTION_COLUMN_WIDTH,
          left: 0,
          pinned: "left",
          sort: null,
          sortIndex: null,
          isSelectionColumn: true,
        }
      : null;

    const pinnedLeftRaw = [
      ...(selectionColumn ? [selectionColumn] : []),
      ...baseColumns.filter((col) => col.pinned === "left"),
    ];
    const centerRaw = baseColumns.filter((col) => col.pinned !== "left" && col.pinned !== "right");
    const pinnedRightRaw = baseColumns.filter((col) => col.pinned === "right");

    const pinnedLeftWithWidths = pinnedLeftRaw.map((col) => ({ ...col }));
    const pinnedLeftAssigned = this.assignLeftOffsets(pinnedLeftWithWidths);
    const pinnedLeftWidth = pinnedLeftAssigned.reduce((sum, col) => sum + col.width, 0);

    const pinnedRightWithWidths = pinnedRightRaw.map((col) => ({ ...col }));
    const pinnedRightAssigned = this.assignLeftOffsets(pinnedRightWithWidths);
    const pinnedRightWidth = pinnedRightAssigned.reduce((sum, col) => sum + col.width, 0);

    const centerViewport = Math.max(0, this.viewportWidth - pinnedLeftWidth - pinnedRightWidth);
    const centerWidths = this.computeWidths(centerEntries, centerViewport);
    const centerWithWidths = centerRaw.map((col, i) => ({
      ...col,
      width: centerWidths[i] ?? col.width,
    }));

    this.pinnedLeftColumns = pinnedLeftAssigned;
    this.centerColumns = this.assignLeftOffsets(centerWithWidths);
    this.pinnedRightColumns = pinnedRightAssigned;
    this.columns = [...this.pinnedLeftColumns, ...this.centerColumns, ...this.pinnedRightColumns];
    this.pinnedLeftWidth = pinnedLeftWidth;
    this.centerWidth = this.centerColumns.reduce((sum, col) => sum + col.width, 0);
    this.centerViewportWidth = centerViewport;
    this.pinnedRightWidth = pinnedRightWidth;
    this.totalWidth = this.pinnedLeftWidth + this.centerWidth + this.pinnedRightWidth;
    this.renderWidth =
      this.viewportWidth > 0 && this.totalWidth > this.viewportWidth
        ? this.viewportWidth
        : this.totalWidth;
  }

  private assignLeftOffsets(columns: NormalizedColumn<TData>[]): NormalizedColumn<TData>[] {
    let left = 0;
    return columns.map((column) => {
      const next = { ...column, left };
      left += column.width;
      return next;
    });
  }

  private computeWidths(
    entries: Array<{
      def: ColumnDef<TData>;
      state: ColumnState | undefined;
    }>,
    viewportWidth = this.viewportWidth,
  ): number[] {
    let fixedTotal = 0;
    let flexTotal = 0;

    const specs = entries.map(({ def, state }) => {
      const flex = def.flex ?? 0;
      const minWidth = def.minWidth ?? MIN_WIDTH;
      const maxWidth = def.maxWidth;

      if (flex > 0) {
        flexTotal += flex;
        return { flex, minWidth, maxWidth, width: minWidth };
      }

      const width = state?.width ?? def.width ?? DEFAULT_WIDTH;
      fixedTotal += width;
      return { flex: 0, minWidth, maxWidth, width };
    });

    if (flexTotal > 0 && viewportWidth > 0) {
      const remaining = Math.max(0, viewportWidth - fixedTotal);
      const flexIndexes: number[] = [];

      for (let i = 0; i < specs.length; i++) {
        const spec = specs[i]!;
        if (spec.flex <= 0) continue;
        flexIndexes.push(i);
        let width = Math.max(spec.minWidth, (remaining * spec.flex) / flexTotal);
        if (spec.maxWidth !== undefined) {
          width = Math.min(width, spec.maxWidth);
        }
        spec.width = width;
      }

      const assigned = fixedTotal + flexIndexes.reduce((sum, i) => sum + specs[i]!.width, 0);
      const slack = viewportWidth - assigned;
      if (slack > 0 && flexIndexes.length > 0) {
        const lastFlexIndex = flexIndexes[flexIndexes.length - 1]!;
        specs[lastFlexIndex]!.width += slack;
      }
    } else if (flexTotal > 0) {
      for (let i = 0; i < specs.length; i++) {
        const spec = specs[i]!;
        if (spec.flex > 0) {
          spec.width = spec.minWidth;
        }
      }
    }

    const rounded = specs.map((spec) => Math.round(spec.width));
    if (flexTotal > 0 && viewportWidth > 0) {
      const flexIndexes = specs
        .map((spec, index) => (spec.flex > 0 ? index : -1))
        .filter((index) => index >= 0);
      const total = rounded.reduce((sum, width) => sum + width, 0);
      const remainder = viewportWidth - total;
      if (remainder !== 0 && flexIndexes.length > 0) {
        const lastFlexIndex = flexIndexes[flexIndexes.length - 1]!;
        rounded[lastFlexIndex] = Math.max(
          specs[lastFlexIndex]!.minWidth,
          rounded[lastFlexIndex]! + remainder,
        );
      }
    }

    return rounded;
  }
}

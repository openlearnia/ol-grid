import type { ColumnDef } from "../types/column.js";
import type { NormalizedColumn } from "./column-model.js";
import { isColumnGroup } from "./flatten-column-defs.js";

export type PinRegion = "left" | "center" | "right";

export interface RenderHeaderCell {
  kind: "group" | "leaf" | "selection";
  headerName: string;
  width: number;
  colId?: string;
  groupId?: string;
  sortable?: boolean;
  sort?: "asc" | "desc" | null;
  sortIndex?: number | null;
  pinned?: "left" | "right" | null;
  isSelectionColumn?: boolean;
  /** 1-based grid column index for multi-row header grid layout. */
  gridColumn?: number;
  /** 1-based grid row index for multi-row header grid layout. */
  gridRow?: number;
  colSpan?: number;
  rowSpan?: number;
  filterType?: "text" | "number" | "date" | "custom" | null;
  filterActive?: boolean;
  floatingFilter?: boolean;
  filterParams?: Record<string, unknown>;
}

export interface RenderHeaderRow {
  cells: RenderHeaderCell[];
}

export interface HeaderRowsResult {
  rowCount: number;
  headerHeight: number;
  pinnedLeft: RenderHeaderRow[];
  center: RenderHeaderRow[];
  pinnedRight: RenderHeaderRow[];
}

function resolveFilterType<TData>(
  colDef: ColumnDef<TData>,
): "text" | "number" | "date" | null {
  const filter = colDef.filter;
  if (filter === "number" || filter === "date" || filter === "text") {
    return filter;
  }
  if (filter === true || colDef.filterable === true) {
    return "text";
  }
  return null;
}

function resolveColumnFilterKind<TData>(
  colDef: ColumnDef<TData>,
): "text" | "number" | "date" | "custom" | null {
  const provided = resolveFilterType(colDef);
  if (provided) return provided;
  const filter = colDef.filter;
  if (typeof filter === "function") return "custom";
  if (typeof filter === "string" && filter !== "text" && filter !== "number" && filter !== "date") {
    return "custom";
  }
  return null;
}

function resolveFloatingFilter<TData>(
  colDef: ColumnDef<TData>,
  defaultColDef?: Partial<ColumnDef<TData>>,
): boolean {
  if (colDef.floatingFilter === false) return false;
  const kind = resolveColumnFilterKind(colDef);
  if (kind === "custom") return false;
  if (colDef.floatingFilter === true) return kind !== null;
  if (defaultColDef?.floatingFilter === true) return kind !== null;
  return false;
}

function isFilterModelEntryActive(model: unknown): boolean {
  if (!model || typeof model !== "object") return false;
  const entry = model as Record<string, unknown>;
  if (entry.filterType === "text") {
    return String(entry.filter ?? "").trim().length > 0;
  }
  if (entry.filterType === "number") {
    if (entry.type === "inRange") {
      return entry.filter != null || entry.filterTo != null;
    }
    return entry.filter != null;
  }
  if (entry.filterType === "date") {
    if (entry.type === "inRange") {
      return !!entry.dateFrom || !!entry.dateTo;
    }
    return !!entry.dateFrom;
  }
  if (entry.filterType === "custom") {
    for (const [key, value] of Object.entries(entry)) {
      if (key === "filterType") continue;
      if (Array.isArray(value)) return value.length > 0;
      if (value != null && value !== "") return true;
    }
    return false;
  }
  return false;
}

function regionForPinned(pinned: "left" | "right" | null): PinRegion {
  if (pinned === "left") return "left";
  if (pinned === "right") return "right";
  return "center";
}

function filterDefsForRegion<TData>(
  defs: ColumnDef<TData>[],
  region: PinRegion,
  columnByColId: Map<string, NormalizedColumn<TData>>,
  allLeafColIds: string[],
): ColumnDef<TData>[] {
  let leafIndex = 0;

  const filterNode = (def: ColumnDef<TData>): ColumnDef<TData> | null => {
    if (isColumnGroup(def)) {
      const filteredChildren = def
        .children!.map(filterNode)
        .filter((child): child is ColumnDef<TData> => child !== null);
      if (filteredChildren.length === 0) return null;
      return { ...def, children: filteredChildren };
    }

    const colId = allLeafColIds[leafIndex++]!;
    const column = columnByColId.get(colId);
    const pinned = column?.pinned ?? def.pinned ?? null;
    return regionForPinned(pinned) === region ? def : null;
  };

  return defs.map(filterNode).filter((def): def is ColumnDef<TData> => def !== null);
}

function getTreeDepth<TData>(defs: ColumnDef<TData>[]): number {
  let max = 1;
  for (const def of defs) {
    if (isColumnGroup(def)) {
      max = Math.max(max, 1 + getTreeDepth(def.children!));
    }
  }
  return max;
}

function collectLeafColIdsForRegion<TData>(
  defs: ColumnDef<TData>[],
  region: PinRegion,
  columnByColId: Map<string, NormalizedColumn<TData>>,
  allLeafColIds: string[],
): string[] {
  const result: string[] = [];
  let leafIndex = 0;

  const walk = (nodes: ColumnDef<TData>[]) => {
    for (const def of nodes) {
      if (isColumnGroup(def)) {
        walk(def.children!);
        continue;
      }
      const colId = allLeafColIds[leafIndex]!;
      leafIndex += 1;
      const column = columnByColId.get(colId);
      const pinned = column?.pinned ?? def.pinned ?? null;
      if (regionForPinned(pinned) === region) {
        result.push(colId);
      }
    }
  };

  walk(defs);
  return result;
}

function groupWidth<TData>(
  def: ColumnDef<TData>,
  leafColIdsInSubtree: string[],
  columnByColId: Map<string, NormalizedColumn<TData>>,
): number {
  if (!isColumnGroup(def)) {
    const colId = leafColIdsInSubtree[0];
    if (!colId) return def.width ?? 150;
    return columnByColId.get(colId)?.width ?? def.width ?? 150;
  }

  let leafPtr = 0;
  const widthForNode = (node: ColumnDef<TData>): number => {
    if (!isColumnGroup(node)) {
      const colId = leafColIdsInSubtree[leafPtr++]!;
      return columnByColId.get(colId)?.width ?? node.width ?? 150;
    }
    return node.children!.reduce((sum, child) => sum + widthForNode(child), 0);
  };
  return widthForNode(def);
}

function subtreeLeafColIds<TData>(def: ColumnDef<TData>, allLeafColIds: string[], start: number): string[] {
  if (!isColumnGroup(def)) {
    return [allLeafColIds[start]!];
  }
  let offset = start;
  const ids: string[] = [];
  for (const child of def.children!) {
    const childIds = subtreeLeafColIds(child, allLeafColIds, offset);
    ids.push(...childIds);
    offset += childIds.length;
  }
  return ids;
}

function countSubtreeLeaves<TData>(def: ColumnDef<TData>): number {
  if (!isColumnGroup(def)) return 1;
  return def.children!.reduce((sum, child) => sum + countSubtreeLeaves(child), 0);
}

function buildRowsForRegion<TData>(
  defs: ColumnDef<TData>[],
  region: PinRegion,
  columnByColId: Map<string, NormalizedColumn<TData>>,
  allLeafColIds: string[],
  filterModel: Record<string, unknown>,
  defaultColDef: Partial<ColumnDef<TData>> | undefined,
  maxDepth: number,
): RenderHeaderRow[] {
  const filtered = filterDefsForRegion(defs, region, columnByColId, allLeafColIds);
  const regionLeafColIds = collectLeafColIdsForRegion(
    defs,
    region,
    columnByColId,
    allLeafColIds,
  );
  const rows: RenderHeaderRow[] = Array.from({ length: maxDepth }, () => ({ cells: [] }));
  let leafPointer = 0;

  const walk = (
    nodes: ColumnDef<TData>[],
    rowIndex: number,
    subtreeStart: number,
    gridColStart: number,
  ): number => {
    let localOffset = subtreeStart;
    let gridCol = gridColStart;

    for (const def of nodes) {
      if (isColumnGroup(def)) {
        const subtreeIds = subtreeLeafColIds(def, regionLeafColIds, localOffset);
        const colSpan = subtreeIds.length;
        rows[rowIndex]!.cells.push({
          kind: "group",
          headerName: def.headerName ?? def.groupId ?? def.id ?? "Group",
          width: groupWidth(def, subtreeIds, columnByColId),
          groupId: def.groupId ?? def.id,
          pinned: region === "left" ? "left" : region === "right" ? "right" : null,
          gridColumn: gridCol,
          gridRow: rowIndex + 1,
          colSpan,
        });
        walk(def.children!, rowIndex + 1, localOffset, gridCol);
        localOffset += colSpan;
        gridCol += colSpan;
        continue;
      }

      const colId = regionLeafColIds[leafPointer++]!;
      const column = columnByColId.get(colId);
      const merged = defaultColDef ? { ...defaultColDef, ...def } : def;
      const filterType = resolveColumnFilterKind(merged);
      const leafCell: RenderHeaderCell = {
        kind: "leaf",
        colId,
        headerName: def.headerName ?? colId,
        width: column?.width ?? def.width ?? 150,
        sortable: def.sortable !== false,
        sort: column?.sort ?? null,
        sortIndex: column?.sortIndex ?? null,
        pinned: column?.pinned ?? def.pinned ?? null,
        filterType,
        filterActive: filterType ? isFilterModelEntryActive(filterModel[colId]) : false,
        floatingFilter: resolveFloatingFilter(merged, defaultColDef),
        filterParams: merged.filterParams,
        gridColumn: gridCol,
        gridRow: rowIndex + 1,
      };

      if (rowIndex < maxDepth - 1) {
        // Leaf spans remaining header rows so group labels sit on row 1 only.
        leafCell.rowSpan = maxDepth - rowIndex;
        rows[rowIndex]!.cells.push(leafCell);
      } else {
        leafCell.gridRow = maxDepth;
        rows[maxDepth - 1]!.cells.push(leafCell);
      }
      localOffset += 1;
      gridCol += 1;
    }

    return gridCol;
  };

  walk(filtered, 0, 0, 1);
  return rows;
}

export function buildHeaderRows<TData>(params: {
  columnDefs: ColumnDef<TData>[];
  columns: readonly NormalizedColumn<TData>[];
  filterModel: Record<string, unknown>;
  defaultColDef?: Partial<ColumnDef<TData>>;
  includeSelectionColumn: boolean;
  headerRowHeight?: number;
}): HeaderRowsResult {
  const columnByColId = new Map(params.columns.map((col) => [col.colId, col]));
  // Definition order — columns array is pinned-left → center → pinned-right.
  const allLeafColIds = params.columns
    .filter((col) => !col.isSelectionColumn)
    .sort((a, b) => a.index - b.index)
    .map((col) => col.colId);

  const leftDepth = Math.max(
    1,
    getTreeDepth(filterDefsForRegion(params.columnDefs, "left", columnByColId, allLeafColIds)),
  );
  const centerDepth = Math.max(
    1,
    getTreeDepth(filterDefsForRegion(params.columnDefs, "center", columnByColId, allLeafColIds)),
  );
  const rightDepth = Math.max(
    1,
    getTreeDepth(filterDefsForRegion(params.columnDefs, "right", columnByColId, allLeafColIds)),
  );
  const rowCount = Math.max(leftDepth, centerDepth, rightDepth, 1);
  const headerHeight = params.headerRowHeight ?? 32;

  const pinnedLeft = buildRowsForRegion(
    params.columnDefs,
    "left",
    columnByColId,
    allLeafColIds,
    params.filterModel,
    params.defaultColDef,
    rowCount,
  );
  const center = buildRowsForRegion(
    params.columnDefs,
    "center",
    columnByColId,
    allLeafColIds,
    params.filterModel,
    params.defaultColDef,
    rowCount,
  );
  const pinnedRight = buildRowsForRegion(
    params.columnDefs,
    "right",
    columnByColId,
    allLeafColIds,
    params.filterModel,
    params.defaultColDef,
    rowCount,
  );

  if (params.includeSelectionColumn) {
    const selectionWidth =
      params.columns.find((col) => col.isSelectionColumn)?.width ?? 40;
    if (rowCount > 1) {
      for (const row of pinnedLeft) {
        for (const cell of row.cells) {
          if (cell.gridColumn != null) {
            // Selection checkbox occupies grid column 1 in multi-row headers.
            cell.gridColumn += 1;
          }
        }
      }
    }
    pinnedLeft[0]!.cells.unshift({
      kind: "selection",
      headerName: "",
      width: selectionWidth,
      isSelectionColumn: true,
      gridColumn: rowCount > 1 ? 1 : undefined,
      gridRow: rowCount > 1 ? 1 : undefined,
      rowSpan: rowCount > 1 ? rowCount : undefined,
    });
  }

  return {
    rowCount,
    headerHeight,
    pinnedLeft,
    center,
    pinnedRight,
  };
}

export function hasColumnGroups<TData>(columnDefs: ColumnDef<TData>[]): boolean {
  return columnDefs.some((def) => isColumnGroup(def));
}

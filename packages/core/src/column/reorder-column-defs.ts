import type { ColumnDef } from "../types/column.js";
import { hasColumnGroups } from "./build-header-rows.js";
import { flattenColumnDefs, isColumnGroup } from "./flatten-column-defs.js";
import { resolveColId } from "./resolve-col-id.js";

interface LeafLocation<TData> {
  container: ColumnDef<TData>[];
  index: number;
}

function findLeafLocation<TData>(
  defs: ColumnDef<TData>[],
  colId: string,
): LeafLocation<TData> | null {
  const walk = (arr: ColumnDef<TData>[]): LeafLocation<TData> | null => {
    for (let i = 0; i < arr.length; i++) {
      const def = arr[i]!;
      if (isColumnGroup(def)) {
        const found = walk(def.children!);
        if (found) return found;
        continue;
      }
      if (resolveColId(def, i) === colId) {
        return { container: arr, index: i };
      }
    }
    return null;
  };
  return walk(defs);
}

function reorderFlatColumnDefs<TData>(
  columnDefs: ColumnDef<TData>[],
  orderedColIds: string[],
): ColumnDef<TData>[] {
  const byId = new Map<string, ColumnDef<TData>>();
  columnDefs.forEach((def, index) => {
    byId.set(resolveColId(def, index), def);
  });
  const ordered = orderedColIds
    .map((id) => byId.get(id))
    .filter((def): def is ColumnDef<TData> => def !== undefined);
  const remaining = columnDefs.filter(
    (def, index) => !orderedColIds.includes(resolveColId(def, index)),
  );
  return [...ordered, ...remaining];
}

function resolveMovedColId(currentOrder: string[], orderedColIds: string[], hint?: string): string | null {
  if (hint && currentOrder.includes(hint)) return hint;

  let movedColId: string | null = null;
  let maxDelta = 0;
  for (const colId of currentOrder) {
    const fromIndex = currentOrder.indexOf(colId);
    const toIndex = orderedColIds.indexOf(colId);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) continue;
    const delta = Math.abs(toIndex - fromIndex);
    if (delta > maxDelta) {
      maxDelta = delta;
      movedColId = colId;
    }
  }
  return movedColId;
}

/** Shallow-copy group nodes and child arrays; preserve leaf def references (incl. functions). */
function shallowCopyColumnDefTree<TData>(defs: ColumnDef<TData>[]): ColumnDef<TData>[] {
  return defs.map((def) => {
    if (Array.isArray(def.children)) {
      return { ...def, children: shallowCopyColumnDefTree(def.children) };
    }
    return def;
  });
}

function pruneEmptyGroups<TData>(defs: ColumnDef<TData>[]): ColumnDef<TData>[] {
  const next: ColumnDef<TData>[] = [];
  for (const def of defs) {
    if (Array.isArray(def.children)) {
      const children = pruneEmptyGroups(def.children);
      if (children.length === 0) continue;
      next.push({ ...def, children });
      continue;
    }
    next.push(def);
  }
  return next;
}

function reorderGroupedColumnDefs<TData>(
  columnDefs: ColumnDef<TData>[],
  orderedColIds: string[],
  movedColIdHint?: string,
  regionToIndex?: number,
  regionOrderedColIds?: readonly string[],
  regionFromIndex?: number,
): ColumnDef<TData>[] {
  const currentOrder = flattenColumnDefs(columnDefs).map((entry) => entry.colId);
  const movedColId = resolveMovedColId(currentOrder, orderedColIds, movedColIdHint);
  if (!movedColId) return columnDefs;

  const fromIndex = currentOrder.indexOf(movedColId);
  const toIndex = orderedColIds.indexOf(movedColId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return columnDefs;

  const targetRegionOrder =
    regionOrderedColIds ??
    orderedColIds.filter((id) => currentOrder.includes(id));

  const resolvedRegionFromIndex =
    regionFromIndex ?? targetRegionOrder.indexOf(movedColId);
  if (resolvedRegionFromIndex < 0) return columnDefs;

  let neighborId: string | undefined;
  if (regionToIndex !== undefined) {
    neighborId =
      regionToIndex < resolvedRegionFromIndex
        ? targetRegionOrder[regionToIndex + 1]
        : targetRegionOrder[regionToIndex - 1];
  } else {
    neighborId =
      toIndex < fromIndex ? orderedColIds[toIndex + 1] : orderedColIds[toIndex - 1];
  }
  if (!neighborId) return columnDefs;

  const cloned = shallowCopyColumnDefTree(columnDefs);
  const source = findLeafLocation(cloned, movedColId);
  const neighbor = findLeafLocation(cloned, neighborId);
  if (!source || !neighbor) return columnDefs;

  const fromIdx = source.index;
  let neighborIdx = neighbor.index;
  const sameContainer = source.container === neighbor.container;
  const [leaf] = source.container.splice(fromIdx, 1);
  if (!leaf) return columnDefs;

  if (sameContainer && fromIdx < neighborIdx) {
    neighborIdx -= 1;
  }

  const neighborAfter = findLeafLocation(cloned, neighborId);
  if (!neighborAfter) return columnDefs;

  const insertIndex = toIndex < fromIndex ? neighborAfter.index : neighborAfter.index + 1;
  neighborAfter.container.splice(insertIndex, 0, leaf);
  return pruneEmptyGroups(cloned);
}

export function reorderColumnDefsByLeafOrder<TData>(
  columnDefs: ColumnDef<TData>[],
  orderedColIds: string[],
  movedColId?: string,
  regionToIndex?: number,
  regionOrderedColIds?: readonly string[],
  regionFromIndex?: number,
): ColumnDef<TData>[] {
  if (!hasColumnGroups(columnDefs)) {
    return reorderFlatColumnDefs(columnDefs, orderedColIds);
  }
  return reorderGroupedColumnDefs(
    columnDefs,
    orderedColIds,
    movedColId,
    regionToIndex,
    regionOrderedColIds,
    regionFromIndex,
  );
}

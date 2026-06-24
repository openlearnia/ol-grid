import type { RowNode } from "../types/row.js";
import type { GetRowIdParams } from "../types/options.js";

export interface RowDataTransaction<TData = unknown> {
  add?: TData[];
  addIndex?: number;
  update?: TData[];
  remove?: TData[] | RowNode<TData>[];
}

export interface RowDataTransactionResult<TData = unknown> {
  add: RowNode<TData>[];
  update: RowNode<TData>[];
  remove: RowNode<TData>[];
}

function isRowNode<TData>(item: TData | RowNode<TData>): item is RowNode<TData> {
  return (
    typeof item === "object" &&
    item !== null &&
    "id" in item &&
    "rowIndex" in item &&
    typeof (item as RowNode<TData>).id === "string"
  );
}

function resolveRemoveId<TData>(
  item: TData | RowNode<TData>,
  sourceData: TData[],
  getRowId: (params: GetRowIdParams<TData>) => string,
): string | null {
  if (isRowNode(item)) return item.id;

  const data = item as TData;
  // Prefer reference equality — avoids scanning when caller passes source row objects.
  const byRef = sourceData.indexOf(data);
  if (byRef >= 0) {
    return getRowId({ data, index: byRef });
  }

  for (let index = 0; index < sourceData.length; index++) {
    const row = sourceData[index]!;
    if (getRowId({ data: row, index }) === getRowId({ data, index })) {
      return getRowId({ data: row, index });
    }
  }

  return null;
}

export function applyRowDataTransaction<TData>(
  sourceData: TData[],
  transaction: RowDataTransaction<TData>,
  getRowId: (params: GetRowIdParams<TData>) => string,
  existingById: Map<string, RowNode<TData>>,
): { sourceData: TData[]; result: RowDataTransactionResult<TData> } {
  const result: RowDataTransactionResult<TData> = { add: [], update: [], remove: [] };
  let nextData = [...sourceData];

  if (transaction.remove?.length) {
    const removeIds = new Set<string>();
    for (const item of transaction.remove) {
      const id = resolveRemoveId(item, nextData, getRowId);
      if (id) removeIds.add(id);
    }
    for (const id of removeIds) {
      const node = existingById.get(id);
      if (node) result.remove.push(node);
    }
    nextData = nextData.filter((data, index) => !removeIds.has(getRowId({ data, index })));
  }

  if (transaction.update?.length) {
    for (const data of transaction.update) {
      const id = resolveRemoveId(data, nextData, getRowId);
      if (!id) continue;
      const index = nextData.findIndex((row, rowIndex) => getRowId({ data: row, index: rowIndex }) === id);
      if (index < 0) continue;
      nextData[index] = data;
      const existing = existingById.get(id);
      if (existing) {
        result.update.push({ ...existing, data });
      }
    }
  }

  if (transaction.add?.length) {
    const addIndex =
      transaction.addIndex != null
        ? Math.max(0, Math.min(transaction.addIndex, nextData.length))
        : nextData.length;
    nextData = [
      ...nextData.slice(0, addIndex),
      ...transaction.add,
      ...nextData.slice(addIndex),
    ];
    for (const data of transaction.add) {
      const index = nextData.indexOf(data);
      const id = getRowId({ data, index: index >= 0 ? index : nextData.length - 1 });
      result.add.push({
        id,
        data,
        rowIndex: index >= 0 ? index : nextData.length - 1,
        level: 0,
        expanded: false,
        selected: false,
        group: false,
      });
    }
  }

  return { sourceData: nextData, result };
}

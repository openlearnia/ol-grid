import { describe, expect, it } from "vitest";
import { applyRowDataTransaction } from "./apply-transaction.js";
import type { RowNode } from "../types/row.js";

interface Row {
  id: number;
  name: string;
}

describe("applyRowDataTransaction", () => {
  const getRowId = ({ data }: { data: Row; index: number }) => String(data.id);

  it("adds rows at end by default", () => {
    const source: Row[] = [{ id: 1, name: "Alice" }];
    const { sourceData, result } = applyRowDataTransaction(
      source,
      { add: [{ id: 2, name: "Bob" }] },
      getRowId,
      new Map(),
    );
    expect(sourceData).toHaveLength(2);
    expect(result.add).toHaveLength(1);
    expect(result.add[0]?.id).toBe("2");
  });

  it("inserts rows at addIndex", () => {
    const source: Row[] = [
      { id: 1, name: "Alice" },
      { id: 3, name: "Carol" },
    ];
    const { sourceData } = applyRowDataTransaction(
      source,
      { add: [{ id: 2, name: "Bob" }], addIndex: 1 },
      getRowId,
      new Map(),
    );
    expect(sourceData.map((row) => row.id)).toEqual([1, 2, 3]);
  });

  it("updates rows by id", () => {
    const source: Row[] = [{ id: 1, name: "Alice" }];
    const existing = new Map<string, RowNode<Row>>([
      [
        "1",
        {
          id: "1",
          data: source[0],
          rowIndex: 0,
          level: 0,
          expanded: false,
          selected: false,
          group: false,
        },
      ],
    ]);
    const { sourceData, result } = applyRowDataTransaction(
      source,
      { update: [{ id: 1, name: "Alice Updated" }] },
      getRowId,
      existing,
    );
    expect(sourceData[0]?.name).toBe("Alice Updated");
    expect(result.update).toHaveLength(1);
  });

  it("removes rows by data or RowNode", () => {
    const source: Row[] = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ];
    const node: RowNode<Row> = {
      id: "2",
      data: source[1],
      rowIndex: 1,
      level: 0,
      expanded: false,
      selected: false,
      group: false,
    };
    const { sourceData, result } = applyRowDataTransaction(
      source,
      { remove: [node] },
      getRowId,
      new Map([["2", node]]),
    );
    expect(sourceData).toHaveLength(1);
    expect(result.remove[0]?.id).toBe("2");
  });
});

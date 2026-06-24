import { describe, expect, it } from "vitest";
import { mergeColumnState } from "../apply-column-state.js";
import type { ColumnState } from "../../types/column.js";

const baseState: ColumnState[] = [
  { colId: "id", width: 72, hide: false, pinned: "left", sort: null, sortIndex: null },
  { colId: "name", width: 140, hide: false, pinned: null, sort: null, sortIndex: null },
  { colId: "role", width: 120, hide: false, pinned: null, sort: null, sortIndex: null },
];

describe("mergeColumnState", () => {
  it("merges width and pinned updates for known columns", () => {
    const { columns, success } = mergeColumnState(baseState, {
      state: [
        { colId: "name", width: 200 },
        { colId: "role", pinned: "right" },
      ],
    });

    expect(success).toBe(true);
    expect(columns.find((col) => col.colId === "name")?.width).toBe(200);
    expect(columns.find((col) => col.colId === "role")?.pinned).toBe("right");
  });

  it("returns false when unknown colId has no defaultState", () => {
    const { success } = mergeColumnState(baseState, {
      state: [{ colId: "missing", width: 100 }],
    });
    expect(success).toBe(false);
  });

  it("applies defaultState for unknown colIds", () => {
    const { columns, success } = mergeColumnState(baseState, {
      state: [{ colId: "newCol", width: 88 }],
      defaultState: { hide: false, pinned: null },
    });

    expect(success).toBe(true);
    expect(columns.find((col) => col.colId === "newCol")?.width).toBe(88);
  });

  it("reorders columns when applyOrder is true", () => {
    const { columns } = mergeColumnState(baseState, {
      applyOrder: true,
      state: [{ colId: "role" }, { colId: "name" }, { colId: "id" }],
    });

    expect(columns.map((col) => col.colId)).toEqual(["role", "name", "id"]);
  });
});

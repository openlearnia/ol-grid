import { describe, expect, it } from "vitest";
import {
  createSelectionState,
  handleRowClickSelection,
  isRowSelected,
  selectionChanged,
  toggleRowSelection,
  deselectAllRows,
  getHeaderCheckboxState,
  selectAllRows,
  toggleSelectAll,
} from "./selection-manager.js";

describe("selection-manager", () => {
  describe("single row mode", () => {
    it("selects a row on click", () => {
      const state = createSelectionState("singleRow");
      const next = handleRowClickSelection(state, { rowId: "a", multiSelect: false });
      expect(isRowSelected(next, "a")).toBe(true);
      expect(next.selectedRowIds.size).toBe(1);
    });

    it("replaces selection when another row is clicked", () => {
      let state = createSelectionState("singleRow");
      state = handleRowClickSelection(state, { rowId: "a", multiSelect: false });
      state = handleRowClickSelection(state, { rowId: "b", multiSelect: false });
      expect(isRowSelected(state, "a")).toBe(false);
      expect(isRowSelected(state, "b")).toBe(true);
    });

    it("ignores multiSelect modifier in single mode", () => {
      let state = createSelectionState("singleRow");
      state = handleRowClickSelection(state, { rowId: "a", multiSelect: false });
      state = handleRowClickSelection(state, { rowId: "b", multiSelect: true });
      expect(isRowSelected(state, "a")).toBe(false);
      expect(isRowSelected(state, "b")).toBe(true);
    });
  });

  describe("multi row mode", () => {
    it("selects a row on click without modifier", () => {
      const state = createSelectionState("multiRow");
      const next = handleRowClickSelection(state, { rowId: "a", multiSelect: false });
      expect(isRowSelected(next, "a")).toBe(true);
    });

    it("toggles rows with multiSelect", () => {
      let state = createSelectionState("multiRow");
      state = handleRowClickSelection(state, { rowId: "a", multiSelect: false });
      state = handleRowClickSelection(state, { rowId: "b", multiSelect: true });
      expect(isRowSelected(state, "a")).toBe(true);
      expect(isRowSelected(state, "b")).toBe(true);

      state = handleRowClickSelection(state, { rowId: "b", multiSelect: true });
      expect(isRowSelected(state, "b")).toBe(false);
      expect(isRowSelected(state, "a")).toBe(true);
    });

    it("replaces selection on plain click", () => {
      let state = createSelectionState("multiRow");
      state = handleRowClickSelection(state, { rowId: "a", multiSelect: true });
      state = handleRowClickSelection(state, { rowId: "b", multiSelect: true });
      state = handleRowClickSelection(state, { rowId: "c", multiSelect: false });
      expect(state.selectedRowIds).toEqual(new Set(["c"]));
    });

    it("toggles via checkbox helper", () => {
      let state = createSelectionState("multiRow");
      state = toggleRowSelection(state, "a");
      expect(isRowSelected(state, "a")).toBe(true);
      state = toggleRowSelection(state, "a");
      expect(isRowSelected(state, "a")).toBe(false);
    });
  });

  describe("selectionChanged", () => {
    it("detects added and removed rows", () => {
      const prev = createSelectionState("multiRow");
      let next = handleRowClickSelection(prev, { rowId: "a", multiSelect: false });
      expect(selectionChanged(prev, next)).toBe(true);

      next = handleRowClickSelection(next, { rowId: "a", multiSelect: false });
      expect(selectionChanged(prev, next)).toBe(true);
      expect(selectionChanged(next, next)).toBe(false);
    });
  });

  describe("select all", () => {
    const rowIds = ["1", "2", "3"];

    it("selects all displayed rows", () => {
      const state = selectAllRows(createSelectionState("multiRow"), rowIds);
      expect(state.selectedRowIds).toEqual(new Set(rowIds));
    });

    it("deselects all rows", () => {
      let state = selectAllRows(createSelectionState("multiRow"), rowIds);
      state = deselectAllRows(state);
      expect(state.selectedRowIds.size).toBe(0);
    });

    it("reports header checkbox state", () => {
      let state = createSelectionState("multiRow");
      expect(getHeaderCheckboxState(state, rowIds)).toBe("unchecked");

      state = selectAllRows(state, rowIds);
      expect(getHeaderCheckboxState(state, rowIds)).toBe("checked");

      state = toggleRowSelection(state, "2");
      expect(getHeaderCheckboxState(state, rowIds)).toBe("indeterminate");
    });

    it("toggles between all and none", () => {
      let state = createSelectionState("multiRow");
      state = toggleSelectAll(state, rowIds);
      expect(getHeaderCheckboxState(state, rowIds)).toBe("checked");

      state = toggleSelectAll(state, rowIds);
      expect(getHeaderCheckboxState(state, rowIds)).toBe("unchecked");
    });
  });
});

import { describe, expect, it } from "vitest";
import { mergeColumnDefs } from "../merge-column-defs.js";

describe("mergeColumnDefs", () => {
  it("shallow-merges defaultColDef into each column def", () => {
    const merged = mergeColumnDefs(
      [{ field: "name", headerName: "Name" }, { field: "age", sortable: false }],
      { sortable: true, width: 120, editable: false },
    );

    expect(merged[0]).toMatchObject({
      field: "name",
      headerName: "Name",
      sortable: true,
      width: 120,
      editable: false,
    });
    expect(merged[1]).toMatchObject({
      field: "age",
      sortable: false,
      width: 120,
    });
  });

  it("deep-merges meta only", () => {
    const merged = mergeColumnDefs(
      [{ field: "name", meta: { tier: "primary" } }],
      { meta: { source: "default", tier: "fallback" } },
    );

    expect(merged[0]?.meta).toEqual({ source: "default", tier: "primary" });
  });
});

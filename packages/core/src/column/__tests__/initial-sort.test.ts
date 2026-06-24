import { describe, expect, it } from "vitest";
import {
  extractInitialSortModelFromColumnDefs,
  resolveColumnDefInitialSort,
} from "../initial-sort.js";

describe("resolveColumnDefInitialSort", () => {
  it("prefers sort over initialSort", () => {
    expect(
      resolveColumnDefInitialSort({
        field: "name",
        sort: "asc",
        initialSort: "desc",
      }),
    ).toEqual({ sort: "asc" });
  });

  it("reads initialSort when sort is absent", () => {
    expect(resolveColumnDefInitialSort({ field: "name", initialSort: "desc" })).toEqual({
      sort: "desc",
    });
  });

  it("reads SortDef with sortIndex", () => {
    expect(
      resolveColumnDefInitialSort({
        field: "name",
        initialSort: { sort: "asc", sortIndex: 2 },
      }),
    ).toEqual({ sort: "asc", sortIndex: 2 });
  });
});

describe("extractInitialSortModelFromColumnDefs", () => {
  it("returns empty model when no columns declare initial sort", () => {
    expect(
      extractInitialSortModelFromColumnDefs([
        { field: "name" },
        { field: "role", initialSort: undefined },
      ]),
    ).toEqual([]);
  });

  it("extracts single-column initial sort in declaration order", () => {
    expect(
      extractInitialSortModelFromColumnDefs([
        { field: "country" },
        { field: "name", initialSort: "desc" },
      ]),
    ).toEqual([{ colId: "name", sort: "desc" }]);
  });

  it("orders multi-column initial sort by sortIndex", () => {
    expect(
      extractInitialSortModelFromColumnDefs([
        { field: "city", initialSort: { sort: "asc", sortIndex: 1 } },
        { field: "country", initialSort: { sort: "asc", sortIndex: 0 } },
      ]),
    ).toEqual([
      { colId: "country", sort: "asc" },
      { colId: "city", sort: "asc" },
    ]);
  });

  it("includes leaf columns nested inside column groups", () => {
    expect(
      extractInitialSortModelFromColumnDefs([
        {
          headerName: "Organization",
          children: [{ field: "role", initialSort: "asc" }],
        },
      ]),
    ).toEqual([{ colId: "role", sort: "asc" }]);
  });
});

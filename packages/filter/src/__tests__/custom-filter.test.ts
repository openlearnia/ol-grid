/** @vitest-environment happy-dom */
import { describe, expect, it } from "vitest";
import type { FilterComponent, FilterDisplayParams, RowNode } from "@ol-grid/core";
import {
  applyColumnFilters,
  createEmptyCustomFilterModel,
  doesCustomFilterPass,
  isCustomFilterModelActive,
  isColumnFilterActive,
  resolveCustomFilterSource,
} from "../index.js";

interface Person {
  name: string;
  status: string;
}

function node(data: Person, index = 0): RowNode<Person> {
  return {
    id: String(index),
    data,
    rowIndex: index,
    level: 0,
    expanded: false,
    selected: false,
    group: false,
  };
}

function createHeadlessStatusFilter(
  params: FilterDisplayParams<Person>,
): FilterComponent<Person> {
  let selected: string | null = null;

  return {
    init() {
      const existing = params.getModel();
      if (existing?.value) selected = String(existing.value);
    },
    getGui: () => {
      const el = document.createElement("span");
      el.textContent = selected ?? "";
      return el;
    },
    getModel: () =>
      selected ? { filterType: "custom", value: selected } : { filterType: "custom" },
    setModel(model) {
      selected = model?.value ? String(model.value) : null;
    },
    isFilterActive: () => selected != null && selected.length > 0,
    doesFilterPass: ({ data, filterModel }) =>
      !filterModel.value || data.status === filterModel.value,
  };
}

describe("custom filter", () => {
  it("resolveCustomFilterSource detects registry keys and inline factories", () => {
    expect(resolveCustomFilterSource({ field: "x", filter: "statusFilter" })).toEqual({
      key: "statusFilter",
    });
    expect(resolveCustomFilterSource({ field: "x", filter: createHeadlessStatusFilter })).toEqual({
      factory: createHeadlessStatusFilter,
    });
    expect(resolveCustomFilterSource({ field: "x", filter: "text" })).toBeNull();
  });

  it("isCustomFilterModelActive detects non-empty custom state", () => {
    expect(isCustomFilterModelActive(createEmptyCustomFilterModel())).toBe(false);
    expect(isCustomFilterModelActive({ filterType: "custom", value: "Active" })).toBe(true);
    expect(isCustomFilterModelActive({ filterType: "custom", values: ["a"] })).toBe(true);
  });

  it("doesCustomFilterPass uses component doesFilterPass", () => {
    const rows = [
      node({ name: "A", status: "Active" }),
      node({ name: "B", status: "Contract" }, 1),
    ];
    const columnDefs = [{ field: "status" as const, filter: createHeadlessStatusFilter }];
    const filterModel = {
      status: { filterType: "custom" as const, value: "Active" },
    };

    expect(isColumnFilterActive(filterModel.status)).toBe(true);
    expect(
      doesCustomFilterPass(
        rows[0]!,
        filterModel.status,
        { factory: createHeadlessStatusFilter },
        undefined,
        columnDefs[0]!,
        "status",
        null,
        null,
      ),
    ).toBe(true);
    expect(
      doesCustomFilterPass(
        rows[1]!,
        filterModel.status,
        { factory: createHeadlessStatusFilter },
        undefined,
        columnDefs[0]!,
        "status",
        null,
        null,
      ),
    ).toBe(false);
  });

  it("applyColumnFilters AND-composes custom filters with provided filters", () => {
    const rows = [
      node({ name: "Alice", status: "Active" }),
      node({ name: "Bob", status: "Active" }, 1),
      node({ name: "Carol", status: "Contract" }, 2),
    ];
    const columnDefs = [
      { field: "name" as const, filter: "text" as const },
      { field: "status" as const, filter: createHeadlessStatusFilter },
    ];
    const registry = new Map([["statusFilter", { create: createHeadlessStatusFilter }]]);

    const filtered = applyColumnFilters(
      rows,
      columnDefs,
      {
        name: { filterType: "text", type: "contains", filter: "a" },
        status: { filterType: "custom", value: "Active" },
      },
      null,
      null,
      registry,
    );

    expect(filtered.map((entry) => entry.data?.name)).toEqual(["Alice"]);
  });
});

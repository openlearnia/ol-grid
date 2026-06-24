import { describe, expect, it } from "vitest";
import { createEmptyFilterModelForType } from "../apply-column-filters.js";

describe("filterParams defaultOption", () => {
  it("uses defaultOption for text filters when valid", () => {
    expect(createEmptyFilterModelForType("text", "startsWith")).toEqual({
      filterType: "text",
      type: "startsWith",
      filter: "",
    });
  });

  it("falls back when defaultOption is invalid", () => {
    expect(createEmptyFilterModelForType("number", "invalid")).toEqual({
      filterType: "number",
      type: "equals",
      filter: null,
    });
  });

  it("uses defaultOption for number filters when valid", () => {
    expect(createEmptyFilterModelForType("number", "greaterThan")).toEqual({
      filterType: "number",
      type: "greaterThan",
      filter: null,
    });
  });
});

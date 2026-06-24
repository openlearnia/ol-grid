import type { TextFilterModel } from "./types.js";

export function normalizeFilterText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).toLowerCase();
}

export function doesTextFilterPass(
  value: unknown,
  model: TextFilterModel,
  normalizedNeedle = normalizeFilterText(model.filter),
): boolean {
  const haystack = normalizeFilterText(value);

  if (normalizedNeedle === "" && model.type !== "equals" && model.type !== "notEqual") {
    // Empty text filter is a no-op for substring operators (AG Grid parity).
    return true;
  }

  switch (model.type) {
    case "contains":
      return haystack.includes(normalizedNeedle);
    case "notContains":
      return !haystack.includes(normalizedNeedle);
    case "equals":
      return haystack === normalizedNeedle;
    case "notEqual":
      return haystack !== normalizedNeedle;
    case "startsWith":
      return haystack.startsWith(normalizedNeedle);
    case "endsWith":
      return haystack.endsWith(normalizedNeedle);
    default:
      return true;
  }
}

export const TEXT_FILTER_OPTIONS: TextFilterModel["type"][] = [
  "contains",
  "notContains",
  "equals",
  "notEqual",
  "startsWith",
  "endsWith",
];

export const TEXT_FILTER_LABELS: Record<TextFilterModel["type"], string> = {
  contains: "Contains",
  notContains: "Not contains",
  equals: "Equals",
  notEqual: "Not equal",
  startsWith: "Starts with",
  endsWith: "Ends with",
};

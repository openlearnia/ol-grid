import type { TextFilterModel } from "./types.js";

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).toLowerCase();
}

export function doesTextFilterPass(value: unknown, model: TextFilterModel): boolean {
  const haystack = normalizeText(value);
  const needle = normalizeText(model.filter);

  if (needle === "" && model.type !== "equals" && model.type !== "notEqual") {
    return true;
  }

  switch (model.type) {
    case "contains":
      return haystack.includes(needle);
    case "notContains":
      return !haystack.includes(needle);
    case "equals":
      return haystack === needle;
    case "notEqual":
      return haystack !== needle;
    case "startsWith":
      return haystack.startsWith(needle);
    case "endsWith":
      return haystack.endsWith(needle);
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

import { date, dayEnd, dayStart, sameDay } from "@ol-grid/tempo";
import type { DateFilterModel } from "./types.js";

function toTimestamp(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : time;
  }
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  try {
    return date(String(value)).getTime();
  } catch {
    return null;
  }
}

function parseDateInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  try {
    return date(value);
  } catch {
    return null;
  }
}

export function doesDateFilterPass(value: unknown, model: DateFilterModel): boolean {
  const cellTime = toTimestamp(value);
  const fromDate = parseDateInput(model.dateFrom);
  const toDate = parseDateInput(model.dateTo ?? null);

  if (fromDate === null && model.type !== "inRange") {
    return true;
  }

  if (cellTime === null) {
    return false;
  }

  const cellDate = new Date(cellTime);

  switch (model.type) {
    case "equals":
      return fromDate !== null && sameDay(cellDate, fromDate);
    case "notEqual":
      return fromDate !== null && !sameDay(cellDate, fromDate);
    case "lessThan":
      return fromDate !== null && cellTime < dayStart(fromDate).getTime();
    case "greaterThan":
      return fromDate !== null && cellTime > dayEnd(fromDate).getTime();
    case "inRange":
      if (fromDate === null || toDate === null) return true;
      return (
        cellTime >= dayStart(fromDate).getTime() && cellTime <= dayEnd(toDate).getTime()
      );
    default:
      return true;
  }
}

export const DATE_FILTER_OPTIONS: DateFilterModel["type"][] = [
  "equals",
  "notEqual",
  "lessThan",
  "greaterThan",
  "inRange",
];

export const DATE_FILTER_LABELS: Record<DateFilterModel["type"], string> = {
  equals: "Equals",
  notEqual: "Not equal",
  lessThan: "Before",
  greaterThan: "After",
  inRange: "In range",
};

export type TextFilterType =
  | "contains"
  | "notContains"
  | "equals"
  | "notEqual"
  | "startsWith"
  | "endsWith";

export type NumberFilterType =
  | "equals"
  | "notEqual"
  | "lessThan"
  | "lessThanOrEqual"
  | "greaterThan"
  | "greaterThanOrEqual"
  | "inRange";

export type DateFilterType =
  | "equals"
  | "notEqual"
  | "lessThan"
  | "greaterThan"
  | "inRange";

export interface TextFilterModel {
  filterType: "text";
  type: TextFilterType;
  filter: string;
}

export interface NumberFilterModel {
  filterType: "number";
  type: NumberFilterType;
  filter: number | null;
  filterTo?: number | null;
}

export interface DateFilterModel {
  filterType: "date";
  type: DateFilterType;
  dateFrom: string | null;
  dateTo?: string | null;
}

export type ColumnFilterModel = TextFilterModel | NumberFilterModel | DateFilterModel;

export type FilterModel = Record<string, ColumnFilterModel>;

export type ProvidedFilterType = "text" | "number" | "date";

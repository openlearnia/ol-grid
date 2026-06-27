export type DemoColumnDef = {
  id?: string;
  field?: string;
  headerName?: string;
  groupId?: string;
  children?: DemoColumnDef[];
  width?: number;
  minWidth?: number;
  flex?: number;
  pinned?: "left" | "right" | null;
  sortable?: boolean;
  filter?: boolean | "text" | "number" | "date";
  floatingFilter?: boolean;
  editable?: boolean;
  cellEditor?: string;
  cellEditorParams?: Record<string, unknown>;
  cellRenderer?: string | unknown;
  valueParser?: unknown;
  valueSetter?: unknown;
  valueFormatter?: unknown;
};

export interface Person {
  id: number;
  name: string;
  role: string;
  department: string;
  location: string;
  startYear: number;
  joinDate: string;
  salary: number;
  status: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  rating: number;
  inStock: boolean;
}

export type DatasetId =
  | "empty"
  | "employees-tiny"
  | "employees-small"
  | "employees-medium"
  | "employees-large"
  | "employees-xl"
  | "employees-100k"
  | "products";

export interface DatasetConfig {
  id: DatasetId;
  label: string;
  rowData: unknown[];
  columnDefs: DemoColumnDef[];
  getRowId: (params: { data: unknown }) => string;
  exportFileName: string;
}

const roles = ["Engineer", "Designer", "PM", "QA", "Support"];
const departments = ["Platform", "Product", "Growth", "Finance", "People"];
const locations = ["Remote", "NYC", "London", "Berlin", "Tokyo"];
const statuses = ["Active", "On leave", "Contract"];

const productCategories = ["Hardware", "Software", "Accessories", "Services", "Consumables"];
const productNames = [
  "Wireless Mouse",
  "Mechanical Keyboard",
  "USB-C Hub",
  "Monitor Stand",
  "Webcam HD",
  "Noise-cancel Headset",
  "Docking Station",
  "Portable SSD",
  "Ergonomic Chair",
  "Standing Desk",
];

function formatRowCount(count: number): string {
  return count.toLocaleString("en-US");
}

function generateEmployees(count: number): Person[] {
  return Array.from({ length: count }, (_, index) => {
    const id = index + 1;
    return {
      id,
      name: `User ${id}`,
      role: roles[index % roles.length]!,
      department: departments[index % departments.length]!,
      location: locations[index % locations.length]!,
      startYear: 2015 + (index % 10),
      joinDate: `${2015 + (index % 10)}-${String((index % 12) + 1).padStart(2, "0")}-15`,
      salary: 70000 + (index % 50) * 1500,
      status: statuses[index % statuses.length]!,
    };
  });
}

function generateProducts(count: number): Product[] {
  return Array.from({ length: count }, (_, index) => {
    const id = `SKU-${String(index + 1).padStart(5, "0")}`;
    return {
      id,
      name: `${productNames[index % productNames.length]!} ${Math.floor(index / productNames.length) + 1}`,
      category: productCategories[index % productCategories.length]!,
      price: 9.99 + (index % 200) * 4.5,
      stock: index % 120,
      rating: 3 + (index % 20) / 10,
      inStock: index % 7 !== 0,
    };
  });
}

const employeeColumnDefs: DemoColumnDef[] = [
  { field: "id", headerName: "ID", width: 72, pinned: "left" },
  {
    field: "name",
    headerName: "Name",
    width: 140,
    pinned: "left",
    editable: true,
    filter: "text",
    floatingFilter: true,
  },
  {
    headerName: "Organization",
    groupId: "organization",
    children: [
      { field: "role", headerName: "Role", width: 120, editable: true, filter: "text" },
      { field: "department", headerName: "Department", width: 130, filter: "text", floatingFilter: true },
      { field: "location", headerName: "Location", width: 110 },
    ],
  },
  {
    headerName: "Timeline",
    groupId: "timeline",
    children: [
      {
        field: "joinDate",
        headerName: "Join date",
        width: 110,
        filter: "date",
      },
      {
        field: "startYear",
        headerName: "Start",
        width: 90,
        editable: true,
        cellEditor: "number",
        cellEditorParams: { min: 1990, max: 2030, step: 1 },
        valueParser: ({ newValue }: { newValue: unknown }) => Number(newValue),
      },
    ],
  },
  {
    field: "salary",
    headerName: "Salary",
    width: 110,
    editable: true,
    pinned: "right",
    filter: "number",
    cellEditor: "number",
    cellEditorParams: { min: 0, step: 1000 },
    valueParser: ({ newValue }: { newValue: unknown }) => Number(newValue),
    valueSetter: ({ data, newValue }: { data: Person; newValue: unknown }) => {
      if (typeof newValue !== "number" || newValue < 30000) return false;
      data.salary = newValue;
      return true;
    },
    valueFormatter: ({ value }: { value: unknown }) =>
      typeof value === "number" ? `$${value.toLocaleString()}` : "",
  },
  {
    field: "status",
    headerName: "Status",
    flex: 1,
    editable: true,
    cellEditor: "select",
    cellEditorParams: { values: statuses },
  },
];

const EXTRA_WIDE_EMPLOYEE_FIELDS = [
  "team",
  "level",
  "office",
  "manager",
  "project",
  "skills",
  "notes",
  "region",
  "costCenter",
  "badge",
  "phoneExt",
  "floor",
  "hireQuarter",
  "reviewScore",
] as const;

function wideEmployeeColumnDefs(): DemoColumnDef[] {
  return [
    ...employeeColumnDefs,
    ...EXTRA_WIDE_EMPLOYEE_FIELDS.map((field, index) => ({
      field,
      headerName: field.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()),
      width: 110 + (index % 3) * 10,
    })),
  ];
}

function generateWideEmployees(count: number): Record<string, unknown>[] {
  return Array.from({ length: count }, (_, index) => {
    const id = index + 1;
    return {
      id,
      name: `User ${id}`,
      role: roles[index % roles.length]!,
      department: departments[index % departments.length]!,
      location: locations[index % locations.length]!,
      startYear: 2015 + (index % 10),
      joinDate: `${2015 + (index % 10)}-${String((index % 12) + 1).padStart(2, "0")}-15`,
      salary: 70000 + (index % 50) * 1500,
      status: statuses[index % statuses.length]!,
      team: `Team ${(index % 12) + 1}`,
      level: `L${(index % 6) + 1}`,
      office: locations[(index + 2) % locations.length]!,
      manager: `Mgr ${(index % 40) + 1}`,
      project: `Project ${(index % 8) + 1}`,
      skills: roles[(index + 1) % roles.length]!,
      notes: `Note ${id}`,
      region: locations[index % locations.length]!,
      costCenter: `CC-${100 + (index % 20)}`,
      badge: `B-${String(id).padStart(5, "0")}`,
      phoneExt: `${1000 + (index % 9000)}`,
      floor: `${(index % 10) + 1}`,
      hireQuarter: `Q${(index % 4) + 1}`,
      reviewScore: 3 + (index % 20) / 10,
    };
  });
}

const productColumnDefs: DemoColumnDef[] = [
  { field: "id", headerName: "SKU", width: 100, pinned: "left" },
  {
    field: "name",
    headerName: "Product",
    width: 200,
    pinned: "left",
    editable: true,
    filter: "text",
    floatingFilter: true,
  },
  { field: "category", headerName: "Category", width: 120, filter: "text" },
  {
    field: "price",
    headerName: "Price",
    width: 100,
    editable: true,
    filter: "number",
    cellEditor: "number",
    cellEditorParams: { min: 0, step: 0.01 },
    valueParser: ({ newValue }: { newValue: unknown }) => Number(newValue),
    valueFormatter: ({ value }: { value: unknown }) =>
      typeof value === "number" ? `$${value.toFixed(2)}` : "",
  },
  {
    field: "stock",
    headerName: "Stock",
    width: 90,
    editable: true,
    cellEditor: "number",
    cellEditorParams: { min: 0, step: 1 },
    valueParser: ({ newValue }: { newValue: unknown }) => Number(newValue),
  },
  {
    field: "rating",
    headerName: "Rating",
    width: 90,
    valueFormatter: ({ value }: { value: unknown }) =>
      typeof value === "number" ? value.toFixed(1) : "",
  },
  {
    field: "inStock",
    headerName: "In stock",
    width: 100,
    valueFormatter: ({ value }: { value: unknown }) => (value ? "Yes" : "No"),
  },
];

const EMPLOYEE_SIZES = {
  tiny: 10,
  small: 50,
  medium: 500,
  large: 1_000,
  xl: 10_000,
  "100k": 100_000,
} as const;

const PRODUCT_SIZE = 500;

function employeeDataset(
  id: DatasetId,
  sizeKey: keyof typeof EMPLOYEE_SIZES,
  suffix = "",
): DatasetConfig {
  const count = EMPLOYEE_SIZES[sizeKey];
  const sizeLabel = sizeKey.charAt(0).toUpperCase() + sizeKey.slice(1);
  const suffixLabel = suffix ? ` — ${suffix}` : "";
  return {
    id,
    label: `Employees — ${sizeLabel} (${formatRowCount(count)} rows)${suffixLabel}`,
    rowData: generateEmployees(count),
    columnDefs: employeeColumnDefs,
    getRowId: ({ data }) => String((data as Person).id),
    exportFileName: `employees-${sizeKey}.csv`,
  };
}

const DATASETS: Record<DatasetId, DatasetConfig> = {
  empty: {
    id: "empty",
    label: `Empty (${formatRowCount(0)} rows)`,
    rowData: [],
    columnDefs: employeeColumnDefs,
    getRowId: ({ data }) => String((data as Person).id),
    exportFileName: "empty.csv",
  },
  "employees-tiny": employeeDataset("employees-tiny", "tiny"),
  "employees-small": employeeDataset("employees-small", "small", "keyboard nav"),
  "employees-medium": employeeDataset("employees-medium", "medium"),
  "employees-large": employeeDataset("employees-large", "large"),
  "employees-xl": employeeDataset("employees-xl", "xl"),
  "employees-100k": {
    id: "employees-100k",
    label: `Employees — 100k stress (${formatRowCount(EMPLOYEE_SIZES["100k"])} rows × ${wideEmployeeColumnDefs().length} cols)`,
    rowData: generateWideEmployees(EMPLOYEE_SIZES["100k"]),
    columnDefs: wideEmployeeColumnDefs(),
    getRowId: ({ data }) => String((data as { id: number }).id),
    exportFileName: "employees-100k.csv",
  },
  products: {
    id: "products",
    label: `Products (${formatRowCount(PRODUCT_SIZE)} rows)`,
    rowData: generateProducts(PRODUCT_SIZE),
    columnDefs: productColumnDefs,
    getRowId: ({ data }) => (data as Product).id,
    exportFileName: "products.csv",
  },
};

export const DATASET_OPTIONS = Object.values(DATASETS).map(({ id, label }) => ({ id, label }));

export function getDataset(id: DatasetId): DatasetConfig {
  return DATASETS[id];
}

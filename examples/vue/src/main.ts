import { OlGrid } from "@ol-grid/vue";
import { localeEn } from "@ol-grid/locale-en";
import { createApp, ref } from "vue";

interface Person {
  id: number;
  name: string;
  role: string;
  department: string;
  location: string;
  startYear: number;
  joinDate: string;
  salary: number;
}

const roles = ["Engineer", "Designer", "PM", "QA", "Support"];
const departments = ["Platform", "Product", "Growth", "Finance", "People"];
const locations = ["Remote", "NYC", "London", "Berlin", "Tokyo"];

const rowData: Person[] = Array.from({ length: 1000 }, (_, index) => {
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
  };
});

const App = {
  components: { OlGrid },
  setup() {
    const quickFilter = ref("");
    const sortModel = ref<Array<{ colId: string; sort: "asc" | "desc" }>>([]);
    const filterModel = ref<Record<string, unknown>>({});
    const selectedCount = ref(0);
    const visibleCount = ref(rowData.length);
    const gridRef = ref<{ api: import("@ol-grid/core").GridApi<Person> } | null>(null);

    const columnDefs = [
      { field: "id", headerName: "ID", width: 72, pinned: "left" as const },
      {
        field: "name",
        headerName: "Name",
        width: 140,
        pinned: "left" as const,
        sortable: true,
        filter: "text" as const,
        floatingFilter: true,
      },
      { field: "role", headerName: "Role", width: 120, filter: "text" as const },
      {
        field: "department",
        headerName: "Department",
        width: 130,
        filter: "text" as const,
        floatingFilter: true,
      },
      { field: "location", headerName: "Location", width: 110 },
      {
        field: "joinDate",
        headerName: "Join date",
        width: 110,
        filter: "date" as const,
      },
      {
        field: "startYear",
        headerName: "Start",
        width: 90,
        sortable: true,
      },
      {
        field: "salary",
        headerName: "Salary",
        width: 110,
        pinned: "right" as const,
        filter: "number" as const,
        valueFormatter: ({ value }: { value: unknown }) =>
          typeof value === "number" ? `$${value.toLocaleString()}` : "",
      },
    ];

    function refreshCounts() {
      selectedCount.value = gridRef.value?.api.getSelectedRows().length ?? 0;
      visibleCount.value = gridRef.value?.api.getDisplayedRowCount() ?? rowData.length;
    }

    function exportCsv() {
      gridRef.value?.api.exportDataAsCsv({ fileName: "vue-demo.csv" });
    }

    function getRowId({ data }: { data: Person }) {
      return String(data.id);
    }

    return {
      rowData,
      columnDefs,
      quickFilter,
      sortModel,
      filterModel,
      selectedCount,
      visibleCount,
      gridRef,
      localeEn,
      refreshCounts,
      exportCsv,
      getRowId,
    };
  },
  template: `
    <div class="demo-shell">
      <h1>ol-grid Vue Demo</h1>
      <div class="demo-toolbar">
        <label>
          Quick filter
          <input
            v-model="quickFilter"
            type="search"
            data-testid="demo-quick-filter"
            placeholder="Filter all columns…"
          />
        </label>
        <button type="button" data-testid="demo-export-csv" @click="exportCsv">Export CSV</button>
        <span>{{ visibleCount }} rows visible</span>
        <span>{{ selectedCount }} row(s) selected</span>
        <span>Text/number/date column filters · floating filters on Name &amp; Dept</span>
      </div>
      <div class="demo-grid">
        <OlGrid
          ref="gridRef"
          :column-defs="columnDefs"
          :row-data="rowData"
          row-selection="multiple"
          :quick-filter-text="quickFilter"
          :sort-model="sortModel"
          :filter-model="filterModel"
          :locale-bundle="localeEn"
          @sort-model-change="sortModel = $event"
          @filter-model-change="filterModel = $event"
          :get-row-id="getRowId"
          @grid-ready="refreshCounts"
          @selection-changed="refreshCounts"
          @filter-changed="refreshCounts"
          @sort-changed="refreshCounts"
        />
      </div>
    </div>
  `,
};

createApp(App).mount("#app");

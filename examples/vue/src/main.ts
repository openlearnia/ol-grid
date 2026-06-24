import { OlGrid } from "@ol-grid/vue";
import { createApp, ref } from "vue";

interface Person {
  id: number;
  name: string;
  role: string;
  salary: number;
}

const rowData: Person[] = Array.from({ length: 1000 }, (_, index) => ({
  id: index + 1,
  name: `User ${index + 1}`,
  role: ["Engineer", "Designer", "PM"][index % 3]!,
  salary: 70000 + (index % 50) * 1500,
}));

const App = {
  components: { OlGrid },
  setup() {
    const quickFilter = ref("");
    const sortModel = ref<Array<{ colId: string; sort: "asc" | "desc" }>>([]);
    const selectedCount = ref(0);
    const gridRef = ref<{ api: import("@ol-grid/core").GridApi<Person> } | null>(null);

    const columnDefs = [
      { field: "id", headerName: "ID", width: 72, pinned: "left" as const },
      { field: "name", headerName: "Name", width: 160, sortable: true },
      { field: "role", headerName: "Role", width: 120 },
      {
        field: "salary",
        headerName: "Salary",
        width: 120,
        valueFormatter: ({ value }: { value: unknown }) =>
          typeof value === "number" ? `$${value.toLocaleString()}` : "",
      },
    ];

    function refreshCounts() {
      selectedCount.value = gridRef.value?.api.getSelectedRows().length ?? 0;
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
      selectedCount,
      gridRef,
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
          <input v-model="quickFilter" type="search" placeholder="Filter all columns…" />
        </label>
        <button type="button" @click="exportCsv">Export CSV</button>
        <span>{{ selectedCount }} row(s) selected</span>
        <span>Controlled sortModel · 1000 rows</span>
      </div>
      <div class="demo-grid">
        <OlGrid
          ref="gridRef"
          :column-defs="columnDefs"
          :row-data="rowData"
          row-selection="multiple"
          :quick-filter-text="quickFilter"
          :sort-model="sortModel"
          @sort-model-change="sortModel = $event"
          :get-row-id="getRowId"
          @grid-ready="refreshCounts"
          @selection-changed="refreshCounts"
        />
      </div>
    </div>
  `,
};

createApp(App).mount("#app");

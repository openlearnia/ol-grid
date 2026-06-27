import { OlGrid } from "@ol-grid/vue";
import { localeEn } from "@ol-grid/locale-en";
import { computed, ref } from "vue";
import { createApp } from "vue";
import {
  DATASET_OPTIONS,
  getDataset,
  type DatasetId,
} from "../../shared/datasets";

const App = {
  components: { OlGrid },
  setup() {
    const datasetId = ref<DatasetId>("employees-large");
    const dataset = computed(() => getDataset(datasetId.value));
    const quickFilter = ref("");
    const sortModel = ref<Array<{ colId: string; sort: "asc" | "desc" }>>([]);
    const filterModel = ref<Record<string, unknown>>({});
    const theme = ref<"light" | "dark" | "system">("system");
    const pagination = ref(false);
    const selectedCount = ref(0);
    const visibleCount = ref(dataset.value.rowData.length);
    const gridRef = ref<{ api: import("@ol-grid/core").GridApi<unknown> } | null>(null);

    function refreshCounts() {
      selectedCount.value = gridRef.value?.api.getSelectedRows().length ?? 0;
      visibleCount.value = gridRef.value?.api.getDisplayedRowCount() ?? dataset.value.rowData.length;
    }

    function handleDatasetChange(nextId: DatasetId) {
      datasetId.value = nextId;
      quickFilter.value = "";
      selectedCount.value = 0;
      visibleCount.value = getDataset(nextId).rowData.length;
    }

    function exportCsv() {
      gridRef.value?.api.exportDataAsCsv({ fileName: dataset.value.exportFileName });
    }

    return {
      DATASET_OPTIONS,
      dataset,
      datasetId,
      quickFilter,
      sortModel,
      filterModel,
      theme,
      pagination,
      selectedCount,
      visibleCount,
      gridRef,
      localeEn,
      refreshCounts,
      handleDatasetChange,
      exportCsv,
    };
  },
  template: `
    <div class="demo-shell">
      <h1>ol-grid Vue Demo</h1>
      <div class="demo-toolbar">
        <label>
          Dataset
          <select
            data-testid="demo-dataset-select"
            :value="datasetId"
            @change="handleDatasetChange(($event.target as HTMLSelectElement).value as typeof datasetId)"
          >
            <option v-for="option in DATASET_OPTIONS" :key="option.id" :value="option.id">
              {{ option.label }}
            </option>
          </select>
        </label>
        <label>
          Theme
          <select
            data-testid="demo-theme-select"
            v-model="theme"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </label>
        <label>
          Quick filter
          <input
            v-model="quickFilter"
            type="search"
            data-testid="demo-quick-filter"
            placeholder="Filter all columns…"
          />
        </label>
        <label>
          Pagination
          <select
            data-testid="demo-pagination-select"
            :value="pagination ? 'on' : 'off'"
            @change="pagination = ($event.target as HTMLSelectElement).value === 'on'"
          >
            <option value="off">Off (virtual scroll)</option>
            <option value="on">On (25 / page)</option>
          </select>
        </label>
        <button type="button" data-testid="demo-export-csv" @click="exportCsv">Export CSV</button>
        <span>{{ visibleCount }} rows visible</span>
        <span>{{ selectedCount }} row(s) selected</span>
        <span>Column groups: Organization · Timeline · Shift+click headers for multi-sort</span>
      </div>
      <div class="demo-grid">
        <OlGrid
          :key="datasetId + (pagination ? '-paged' : '-virtual')"
          ref="gridRef"
          :column-defs="dataset.columnDefs"
          :row-data="dataset.rowData"
          row-selection="multiple"
          :quick-filter-text="quickFilter"
          :sort-model="sortModel"
          :filter-model="filterModel"
          :theme="theme"
          :pagination="pagination"
          :pagination-page-size="25"
          :pagination-page-size-selector="[10, 25, 50, 100]"
          :locale-bundle="localeEn"
          :get-row-id="dataset.getRowId"
          @sort-model-change="sortModel = $event"
          @filter-model-change="filterModel = $event"
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

<script lang="ts">
  import OlGrid from "@ol-grid/svelte/OlGrid.svelte";
  import { localeEn } from "@ol-grid/locale-en";
  import type { GridApi } from "@ol-grid/core";
  import {
    DATASET_OPTIONS,
    getDataset,
    type DatasetId,
  } from "../../shared/datasets";

  let datasetId: DatasetId = "employees-large";
  $: dataset = getDataset(datasetId);

  let api: GridApi<unknown> | null = null;
  let quickFilter = "";
  let sortModel: Array<{ colId: string; sort: "asc" | "desc" }> = [];
  let filterModel: Record<string, unknown> = {};
  let theme: "light" | "dark" | "system" = "system";
  let pagination = false;
  let selectedCount = 0;
  let visibleCount = dataset.rowData.length;

  function refreshCounts() {
    selectedCount = api?.getSelectedRows().length ?? 0;
    visibleCount = api?.getDisplayedRowCount() ?? dataset.rowData.length;
  }

  function handleDatasetChange(event: Event) {
    const nextId = (event.currentTarget as HTMLSelectElement).value as DatasetId;
    datasetId = nextId;
    quickFilter = "";
    selectedCount = 0;
    visibleCount = getDataset(nextId).rowData.length;
  }

  function exportCsv() {
    api?.exportDataAsCsv({ fileName: dataset.exportFileName });
  }
</script>

<div class="demo-shell">
  <h1>ol-grid Svelte Demo</h1>
  <div class="demo-toolbar">
    <label>
      Dataset
      <select
        data-testid="demo-dataset-select"
        value={datasetId}
        on:change={handleDatasetChange}
      >
        {#each DATASET_OPTIONS as option (option.id)}
          <option value={option.id}>{option.label}</option>
        {/each}
      </select>
    </label>
    <label>
      Theme
      <select data-testid="demo-theme-select" bind:value={theme}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </label>
    <label>
      Quick filter
      <input
        bind:value={quickFilter}
        type="search"
        data-testid="demo-quick-filter"
        placeholder="Filter all columns…"
      />
    </label>
    <label>
      Pagination
      <select
        data-testid="demo-pagination-select"
        value={pagination ? "on" : "off"}
        on:change={(event) => {
          pagination = (event.currentTarget as HTMLSelectElement).value === "on";
        }}
      >
        <option value="off">Off (virtual scroll)</option>
        <option value="on">On (25 / page)</option>
      </select>
    </label>
    <button type="button" data-testid="demo-export-csv" on:click={exportCsv}>Export CSV</button>
    <span>{visibleCount} rows visible</span>
    <span>{selectedCount} row(s) selected</span>
    <span>Column groups: Organization · Timeline · Shift+click headers for multi-sort</span>
  </div>
  <div class="demo-grid">
    {#key `${datasetId}-${pagination ? "paged" : "virtual"}`}
      <OlGrid
        bind:api
        columnDefs={dataset.columnDefs}
        rowData={dataset.rowData}
        rowSelection="multiple"
        quickFilterText={quickFilter}
        {sortModel}
        {filterModel}
        {theme}
        pagination={pagination}
        paginationPageSize={25}
        paginationPageSizeSelector={[10, 25, 50, 100]}
        localeBundle={localeEn}
        getRowId={dataset.getRowId}
        onSortModelChange={(model) => (sortModel = model)}
        onFilterModelChange={(model) => (filterModel = model)}
        onGridReady={refreshCounts}
        onSelectionChanged={refreshCounts}
        onFilterChanged={refreshCounts}
        onSortChanged={refreshCounts}
      />
    {/key}
  </div>
</div>

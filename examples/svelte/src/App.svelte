<script lang="ts">
  import OlGrid from "@ol-grid/svelte/OlGrid.svelte";
  import type { GridApi } from "@ol-grid/core";

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

  let api: GridApi<Person> | null = null;
  let quickFilter = "";
  let sortModel: Array<{ colId: string; sort: "asc" | "desc" }> = [];
  let selectedCount = 0;

  function refreshCounts() {
    selectedCount = api?.getSelectedRows().length ?? 0;
  }

  function exportCsv() {
    api?.exportDataAsCsv({ fileName: "svelte-demo.csv" });
  }
</script>

<div class="demo-shell">
  <h1>ol-grid Svelte Demo</h1>
  <div class="demo-toolbar">
    <label>
      Quick filter
      <input bind:value={quickFilter} type="search" placeholder="Filter all columns…" />
    </label>
    <button type="button" on:click={exportCsv}>Export CSV</button>
    <span>{selectedCount} row(s) selected</span>
    <span>bind:api · controlled sortModel · 1000 rows</span>
  </div>
  <div class="demo-grid">
    <OlGrid
      bind:api
      {columnDefs}
      {rowData}
      rowSelection="multiple"
      quickFilterText={quickFilter}
      {sortModel}
      onSortModelChange={(model) => (sortModel = model)}
      getRowId={({ data }) => String((data as Person).id)}
      onGridReady={refreshCounts}
      onSelectionChanged={refreshCounts}
    />
  </div>
</div>

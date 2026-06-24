<script lang="ts">
  import OlGrid from "@ol-grid/svelte/OlGrid.svelte";
  import { localeEn } from "@ol-grid/locale-en";
  import type { GridApi } from "@ol-grid/core";

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

  let api: GridApi<Person> | null = null;
  let quickFilter = "";
  let sortModel: Array<{ colId: string; sort: "asc" | "desc" }> = [];
  let filterModel: Record<string, unknown> = {};
  let pagination = false;
  let selectedCount = 0;
  let visibleCount = rowData.length;

  function refreshCounts() {
    selectedCount = api?.getSelectedRows().length ?? 0;
    visibleCount = api?.getDisplayedRowCount() ?? rowData.length;
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
    <span>Text/number/date column filters · floating filters · pagination toggle</span>
  </div>
  <div class="demo-grid">
    {#key pagination ? "paged" : "virtual"}
    <OlGrid
      bind:api
      {columnDefs}
      {rowData}
      rowSelection="multiple"
      quickFilterText={quickFilter}
      {sortModel}
      {filterModel}
      pagination={pagination}
      paginationPageSize={25}
      paginationPageSizeSelector={[10, 25, 50, 100]}
      localeBundle={localeEn}
      onSortModelChange={(model) => (sortModel = model)}
      onFilterModelChange={(model) => (filterModel = model)}
      getRowId={({ data }) => String((data as Person).id)}
      onGridReady={refreshCounts}
      onSelectionChanged={refreshCounts}
      onFilterChanged={refreshCounts}
      onSortChanged={refreshCounts}
    />
    {/key}
  </div>
</div>

<script lang="ts">
  import type { GridApi, GridEngine, GridOptions } from "@ol-grid/core";
  import { createDomRenderer } from "@ol-grid/dom-renderer";
  import { createEventDispatcher, onDestroy, onMount } from "svelte";
  import {
    buildGridOptionsFromProps,
    createAdapterEngine,
    GRID_OPTION_KEYS,
    syncEventHandlers,
    syncGridOptions,
  } from "./engine-setup.js";

  export let api: GridApi | null = null;

  export let columnDefs: GridOptions["columnDefs"] = undefined;
  export let defaultColDef: GridOptions["defaultColDef"] = undefined;
  export let sortModel: GridOptions["sortModel"] = undefined;
  export let rowData: GridOptions["rowData"] = undefined;
  export let rowHeight: GridOptions["rowHeight"] = undefined;
  export let rowSelection: GridOptions["rowSelection"] = undefined;
  export let getRowId: GridOptions["getRowId"] = undefined;
  export let context: GridOptions["context"] = undefined;
  export let quickFilterText: GridOptions["quickFilterText"] = undefined;
  export let filterModel: GridOptions["filterModel"] = undefined;
  export let selectedRowIds: GridOptions["selectedRowIds"] = undefined;
  export let modules: GridOptions["modules"] = undefined;

  export let onGridReady: GridOptions["onGridReady"] = undefined;
  export let onSelectionChanged: GridOptions["onSelectionChanged"] = undefined;
  export let onSortChanged: GridOptions["onSortChanged"] = undefined;
  export let onFilterChanged: GridOptions["onFilterChanged"] = undefined;
  export let onFilterOpened: GridOptions["onFilterOpened"] = undefined;
  export let onDisplayedColumnsChanged: GridOptions["onDisplayedColumnsChanged"] = undefined;
  export let onColumnResized: GridOptions["onColumnResized"] = undefined;
  export let onCellValueChanged: GridOptions["onCellValueChanged"] = undefined;
  export let onRowDataUpdated: GridOptions["onRowDataUpdated"] = undefined;
  export let onSortModelChange: GridOptions["onSortModelChange"] = undefined;
  export let onFilterModelChange: GridOptions["onFilterModelChange"] = undefined;
  export let onSelectionChange: GridOptions["onSelectionChange"] = undefined;

  export let className = "";
  export let style: string | undefined = undefined;

  const dispatch = createEventDispatcher<{ gridReady: { api: GridApi } }>();

  let hostEl: HTMLDivElement;
  let engine: GridEngine | null = null;
  let unsubscribe: (() => void) | null = null;
  let storeVersion = 0;
  const syncedOptions: Partial<Record<(typeof GRID_OPTION_KEYS)[number], unknown>> = {};

  function currentOptions(): GridOptions {
    return buildGridOptionsFromProps({
      columnDefs,
      defaultColDef,
      sortModel,
      rowData,
      rowHeight,
      rowSelection,
      getRowId,
      context,
      quickFilterText,
      filterModel,
      selectedRowIds,
      modules,
      onGridReady,
      onSelectionChanged,
      onSortChanged,
      onFilterChanged,
      onFilterOpened,
      onDisplayedColumnsChanged,
      onColumnResized,
      onCellValueChanged,
      onRowDataUpdated,
      onSortModelChange,
      onFilterModelChange,
      onSelectionChange,
    });
  }

  onMount(() => {
    const options = currentOptions();
    engine = createAdapterEngine(options);
    api = engine.getApi();

    const renderer = createDomRenderer();
    engine.mount(hostEl, renderer);
    syncGridOptions(engine, options, syncedOptions);
    syncEventHandlers(engine, options);

    const readyEvent = {
      api: engine.getApi(),
      columnApi: null,
      context: options.context ?? null,
    };
    onGridReady?.(readyEvent);
    dispatch("gridReady", { api: engine.getApi() });

    unsubscribe = engine.getStore().subscribe(() => {
      storeVersion++;
    });
  });

  $: optionsToSync = currentOptions();
  $: if (engine) {
    syncGridOptions(engine, optionsToSync, syncedOptions);
    syncEventHandlers(engine, optionsToSync);
  }

  onDestroy(() => {
    unsubscribe?.();
    engine?.destroy();
    engine = null;
    api = null;
  });
</script>

<div
  bind:this={hostEl}
  class={`ol-grid-host${className ? ` ${className}` : ""}`}
  {style}
  aria-hidden="true"
  data-store-version={storeVersion}
></div>

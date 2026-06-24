import type { GridOptions } from "@ol-grid/core";
import { createDomRenderer } from "@ol-grid/dom-renderer";
import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  shallowRef,
  watch,
  type PropType,
  type ShallowRef,
} from "vue";
import {
  createAdapterEngine,
  GRID_API_INJECTION_KEY,
  syncEventHandlers,
  syncGridOptions,
} from "./engine-setup.js";

export interface OlGridProps<TData = unknown> extends GridOptions<TData> {
  class?: string;
  style?: Record<string, string | number>;
}

export const OlGrid = defineComponent({
  name: "OlGrid",
  inheritAttrs: false,
  props: {
    class: { type: String, default: undefined },
    style: { type: Object as PropType<Record<string, string | number>>, default: undefined },
    columnDefs: { type: Array as PropType<GridOptions["columnDefs"]>, default: undefined },
    defaultColDef: { type: Object as PropType<GridOptions["defaultColDef"]>, default: undefined },
    sortModel: { type: Array as PropType<GridOptions["sortModel"]>, default: undefined },
    rowData: { type: Array as PropType<GridOptions["rowData"]>, default: undefined },
    rowHeight: { type: Number, default: undefined },
    rowSelection: { type: String as PropType<GridOptions["rowSelection"]>, default: undefined },
    getRowId: { type: Function as PropType<GridOptions["getRowId"]>, default: undefined },
    context: { type: null as unknown as PropType<GridOptions["context"]>, default: undefined },
    quickFilterText: { type: String, default: undefined },
    filterModel: { type: Object as PropType<GridOptions["filterModel"]>, default: undefined },
    pagination: { type: Boolean as PropType<GridOptions["pagination"]>, default: undefined },
    paginationPageSize: {
      type: Number as PropType<GridOptions["paginationPageSize"]>,
      default: undefined,
    },
    paginationPage: { type: Number as PropType<GridOptions["paginationPage"]>, default: undefined },
    paginationPageSizeSelector: {
      type: Array as PropType<GridOptions["paginationPageSizeSelector"]>,
      default: undefined,
    },
    selectedRowIds: { type: Array as PropType<GridOptions["selectedRowIds"]>, default: undefined },
    theme: { type: String as PropType<GridOptions["theme"]>, default: undefined },
    locale: { type: String as PropType<GridOptions["locale"]>, default: undefined },
    localeText: { type: Object as PropType<GridOptions["localeText"]>, default: undefined },
    localeBundle: { type: Object as PropType<GridOptions["localeBundle"]>, default: undefined },
    modules: { type: Array as PropType<GridOptions["modules"]>, default: undefined },
    onGridReady: { type: Function as PropType<GridOptions["onGridReady"]>, default: undefined },
    onSelectionChanged: {
      type: Function as PropType<GridOptions["onSelectionChanged"]>,
      default: undefined,
    },
    onSortChanged: { type: Function as PropType<GridOptions["onSortChanged"]>, default: undefined },
    onFilterChanged: {
      type: Function as PropType<GridOptions["onFilterChanged"]>,
      default: undefined,
    },
    onFilterOpened: { type: Function as PropType<GridOptions["onFilterOpened"]>, default: undefined },
    onDisplayedColumnsChanged: {
      type: Function as PropType<GridOptions["onDisplayedColumnsChanged"]>,
      default: undefined,
    },
    onColumnResized: {
      type: Function as PropType<GridOptions["onColumnResized"]>,
      default: undefined,
    },
    onCellValueChanged: {
      type: Function as PropType<GridOptions["onCellValueChanged"]>,
      default: undefined,
    },
    onRowDataUpdated: {
      type: Function as PropType<GridOptions["onRowDataUpdated"]>,
      default: undefined,
    },
    onSortModelChange: {
      type: Function as PropType<GridOptions["onSortModelChange"]>,
      default: undefined,
    },
    onFilterModelChange: {
      type: Function as PropType<GridOptions["onFilterModelChange"]>,
      default: undefined,
    },
    onSelectionChange: {
      type: Function as PropType<GridOptions["onSelectionChange"]>,
      default: undefined,
    },
  },
  setup(props, { expose }) {
    const hostRef = ref<HTMLDivElement | null>(null);
    const api = shallowRef<ReturnType<ReturnType<typeof createAdapterEngine>["getApi"]> | null>(
      null,
    );
    const storeVersion = ref(0);
    const syncedOptions = ref<Record<string, unknown>>({});
    let engine: ReturnType<typeof createAdapterEngine> | null = null;
    let unsubscribe: (() => void) | null = null;

    provide(GRID_API_INJECTION_KEY, api as ShallowRef<unknown>);

    function buildOptions(): GridOptions {
      return { ...(props as GridOptions) };
    }

    onMounted(() => {
      const options = buildOptions();
      engine = createAdapterEngine(options);
      api.value = engine.getApi();

      const host = hostRef.value;
      if (!host || !engine) return;

      const renderer = createDomRenderer();
      engine.mount(host, renderer);
      syncGridOptions(engine, options, syncedOptions.value);
      syncEventHandlers(engine, options);
      options.onGridReady?.({
        api: engine.getApi(),
        columnApi: null,
        context: options.context ?? null,
      });

      unsubscribe = engine.getStore().subscribe(() => {
        storeVersion.value++;
      });
    });

    watch(
      () => ({ ...props }),
      () => {
        if (!engine) return;
        const options = buildOptions();
        syncGridOptions(engine, options, syncedOptions.value);
        syncEventHandlers(engine, options);
      },
      { deep: true, flush: "post" },
    );

    onBeforeUnmount(() => {
      unsubscribe?.();
      engine?.destroy();
      engine = null;
      api.value = null;
      syncedOptions.value = {};
    });

    expose({ api });

    return () => {
      void storeVersion.value;
      // storeVersion subscription forces render when engine state changes (engine is non-reactive).
      return h("div", {
        ref: hostRef,
        class: props.class ? `ol-grid-host ${props.class}` : "ol-grid-host",
        style: props.style,
      });
    };
  },
});

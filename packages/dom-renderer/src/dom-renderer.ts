import type {
  CellPosition,
  CellRendererFn,
  CellRendererParams,
  GridEngine,
  RenderColumn,
  RenderFrame,
  RendererAdapter,
} from "@ol-grid/core";
import type { RenderHeaderCell, RenderHeaderRow } from "@ol-grid/core";
import { getCellValue, overscanForScrollIntent } from "@ol-grid/core";
import themeCss from "./theme.css";
import { renderCellContent } from "./cell-renderer.js";
import {
  createCellEditorElement,
  mountCustomCellEditor,
  readCustomCellEditorValue,
  readEditorValue,
  resolveCellEditorType,
  usesCustomCellEditor,
  type CustomCellEditorMount,
  type ProvidedCellEditorType,
} from "./custom-cell-editor.js";
import { RowPool, reconcileRowOrder } from "./row-pool.js";
import { shouldSyncScrollBeforePaint } from "./scroll-render.js";
import {
  createFilterButton,
  createFloatingFilterInput,
  mountFilterPopup,
  syncFloatingFilterInputValue,
  type FilterModelEntry,
} from "./filter-ui.js";
import { mountCustomFilterPopup } from "./custom-filter-host.js";
import { createSortAscIcon, createSortDescIcon } from "./icons.js";
import { createPaginationPanel } from "./pagination-panel.js";
import {
  createColumnHeaderDnDController,
  type ColumnHeaderDnDController,
} from "./column-header-dnd.js";
import {
  bodyCellTestId,
  bodyViewportTestId,
  centerViewportTestId,
  gridTestId,
  headerCellTestId,
  headerCheckboxTestId,
  headerGroupTestId,
  rowCheckboxTestId,
  rowTestId,
  sortIndicatorTestId,
} from "./test-ids.js";

const THEME_STYLE_ID = "ol-grid-dom-theme";
const KEYBOARD_LOG_PREFIX = "[ol-grid:keyboard]";

function logKeyboard(event: string, data?: Record<string, unknown>): void {
  if (data) {
    console.log(KEYBOARD_LOG_PREFIX, event, data);
  } else {
    console.log(KEYBOARD_LOG_PREFIX, event);
  }
}

function describeElement(el: Element | null | undefined): string {
  if (!el || !(el instanceof Element)) return "none";
  const tag = el.tagName.toLowerCase();
  const cls =
    typeof el.className === "string" && el.className
      ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}`
      : "";
  const role = el.getAttribute("role");
  const ds = (el as HTMLElement).dataset?.colId
    ? ` col=${(el as HTMLElement).dataset.colId}`
    : (el as HTMLElement).dataset?.focusSentinel
      ? ` sentinel=${(el as HTMLElement).dataset.focusSentinel}`
      : "";
  return `${tag}${cls}${role ? ` role=${role}` : ""}${ds}`;
}

function describeCell(focused: CellPosition | null | undefined): string {
  if (!focused) return "null";
  return `{row:${focused.rowIndex}, colId:${focused.colId}}`;
}

function getCellValueFromEngine(
  engine: GridEngine,
  node: import("@ol-grid/core").RowNode,
  colDef: import("@ol-grid/core").ColumnDef,
): unknown {
  return getCellValue(node, colDef, engine.getApi(), engine.getOptions().context ?? null);
}

function ensureThemeStyles(): void {
  if (typeof document === "undefined" || document.getElementById(THEME_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = THEME_STYLE_ID;
  style.textContent = themeCss;
  document.head.appendChild(style);
}

function createFocusSentinel(position: "before" | "after"): HTMLElement {
  const sentinel = document.createElement("div");
  sentinel.className = "ol-grid__focus-sentinel";
  sentinel.dataset.focusSentinel = position;
  sentinel.setAttribute("aria-hidden", "true");
  sentinel.tabIndex = -1;
  return sentinel;
}

function countSortedColumns(columns: Array<{ sort: "asc" | "desc" | null }>): number {
  return columns.filter((column) => column.sort === "asc" || column.sort === "desc").length;
}

function fillSortIndicator(
  indicator: HTMLElement,
  sort: "asc" | "desc" | null | undefined,
  sortIndex: number | null | undefined,
  sortedColumnCount: number,
): void {
  indicator.replaceChildren();
  if (sort === "asc") {
    indicator.appendChild(createSortAscIcon());
  } else if (sort === "desc") {
    indicator.appendChild(createSortDescIcon());
  }
  if (sortedColumnCount > 1 && sortIndex != null && sort) {
    const order = document.createElement("span");
    order.className = "ol-grid__sort-order";
    // 1-based priority badge — only shown when more than one column is sorted.
    order.textContent = String(sortIndex + 1);
    indicator.appendChild(order);
  }
}

export class DomRenderer implements RendererAdapter {
  readonly type = "dom" as const;

  private host: HTMLElement | null = null;
  private sentinelBefore: HTMLElement | null = null;
  private sentinelAfter: HTMLElement | null = null;
  private root: HTMLElement | null = null;
  private header: HTMLElement | null = null;
  private headerPinnedLeft: HTMLElement | null = null;
  private headerCenter: HTMLElement | null = null;
  private headerPinnedRight: HTMLElement | null = null;
  private headerSpacer: HTMLElement | null = null;
  private headerCenterScroll: HTMLElement | null = null;
  private headerMain: HTMLElement | null = null;
  private floatingFilters: HTMLElement | null = null;
  private floatingPinnedLeft: HTMLElement | null = null;
  private floatingCenter: HTMLElement | null = null;
  private floatingCenterRow: HTMLElement | null = null;
  private floatingPinnedRight: HTMLElement | null = null;
  private filterPopupCleanup: (() => void) | null = null;
  private body: HTMLElement | null = null;
  private bodyInner: HTMLElement | null = null;
  private bodyPinnedLeft: HTMLElement | null = null;
  private bodyPinnedRight: HTMLElement | null = null;
  private bodySpacer: HTMLElement | null = null;
  private centerScroll: HTMLElement | null = null;
  private centerInner: HTMLElement | null = null;
  private rowsPinned: HTMLElement | null = null;
  private rowsCenter: HTMLElement | null = null;
  private rowsPinnedRight: HTMLElement | null = null;
  private overlay: HTMLElement | null = null;
  private paginationPanel: HTMLElement | null = null;
  private engine: GridEngine | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private frame: RenderFrame | null = null;
  private activeEditor: HTMLElement | null = null;
  private activeEditorType: ProvidedCellEditorType | "custom" | "framework" | null = null;
  private activeCustomEditor: CustomCellEditorMount | null = null;
  private suppressEditorBlur = false;
  private keyboardNavFocusPending = false;
  private resizeState: {
    colId: string;
    startX: number;
    startWidth: number;
  } | null = null;
  private columnHeaderDnD: ColumnHeaderDnDController | null = null;
  private columnMoveIndicator: HTMLElement | null = null;
  private suppressHeaderClick = false;
  private scrollLoopRafId: number | null = null;
  private scrollWatcherActive = false;
  /** Last body scrollTop observed — detects native scrollbar drag before store catches up. */
  private lastKnownDomScrollTop = 0;
  /** Last center scrollLeft observed — same for horizontal scrollbar drag. */
  private lastKnownDomScrollLeft = 0;
  /** px/ms from the latest vertical scroll event — drives sync-scroll decisions. */
  private scrollVelocityPxMs = 0;
  private lastVelocityScrollTop = 0;
  private lastVelocityTime = 0;
  /** True while the user is dragging the native vertical scrollbar. */
  private scrollbarDragging = false;
  /** True from pointerdown on scrollbar gutter until pointerup. */
  private nativeScrollbarActive = false;
  /** True for the scroll event(s) immediately following a wheel on body. */
  private wheelScrollPending = false;
  /** Nested depth for programmatic body.scrollTop writes (store / sync scroll). */
  private programmaticScrollDepth = 0;
  /** Prevents syncViewportScrollFromStore from fighting render-then-scroll. */
  private scrollCommitInProgress = false;
  /** Row index hovered across pinned-left, center, and pinned-right panels. */
  private hoveredRowIndex: number | null = null;
  private readonly rowPool = new RowPool();

  mount(host: HTMLElement, engine: GridEngine): void {
    ensureThemeStyles();
    this.host = host;
    this.engine = engine;

    // Drop leftover grid chrome from a prior mount (e.g. StrictMode remount).
    for (const child of [...host.children]) {
      if (
        child.classList.contains("ol-grid__root") ||
        child.classList.contains("ol-grid__focus-sentinel")
      ) {
        child.remove();
      }
    }

    host.classList.add("ol-grid");
    host.dataset.testid = gridTestId;
    host.setAttribute("role", "grid");
    host.tabIndex = 0;
    host.style.setProperty("--ol-grid-row-height", `${engine.getRowHeight()}px`);

    const root = document.createElement("div");
    root.className = "ol-grid__root";

    const header = document.createElement("div");
    header.className = "ol-grid__header";
    header.setAttribute("role", "rowgroup");

    const headerMain = document.createElement("div");
    headerMain.className = "ol-grid__header-main";

    const headerPinnedLeft = document.createElement("div");
    headerPinnedLeft.className = "ol-grid__header-pinned-left";

    const headerCenter = document.createElement("div");
    headerCenter.className = "ol-grid__header-center";

    const headerCenterScroll = document.createElement("div");
    headerCenterScroll.className = "ol-grid__header-rows-scroll";
    headerCenter.appendChild(headerCenterScroll);

    const headerPinnedRight = document.createElement("div");
    headerPinnedRight.className = "ol-grid__header-pinned-right";

    const headerSpacer = document.createElement("div");
    headerSpacer.className = "ol-grid__layout-spacer";
    headerSpacer.setAttribute("aria-hidden", "true");

    headerMain.appendChild(headerPinnedLeft);
    headerMain.appendChild(headerCenter);
    headerMain.appendChild(headerPinnedRight);
    headerMain.appendChild(headerSpacer);

    const floatingFilters = document.createElement("div");
    floatingFilters.className = "ol-grid__floating-filters";
    floatingFilters.hidden = true;

    const floatingPinnedLeft = document.createElement("div");
    floatingPinnedLeft.className = "ol-grid__floating-filters-pinned-left";
    floatingPinnedLeft.setAttribute("role", "row");

    const floatingCenter = document.createElement("div");
    floatingCenter.className = "ol-grid__floating-filters-center";

    const floatingCenterRow = document.createElement("div");
    floatingCenterRow.className =
      "ol-grid__floating-filter-row ol-grid__floating-filter-row--center";
    floatingCenterRow.setAttribute("role", "row");
    floatingCenter.appendChild(floatingCenterRow);

    const floatingPinnedRight = document.createElement("div");
    floatingPinnedRight.className = "ol-grid__floating-filters-pinned-right";
    floatingPinnedRight.setAttribute("role", "row");

    const floatingSpacer = document.createElement("div");
    floatingSpacer.className = "ol-grid__layout-spacer";
    floatingSpacer.setAttribute("aria-hidden", "true");

    floatingFilters.appendChild(floatingPinnedLeft);
    floatingFilters.appendChild(floatingCenter);
    floatingFilters.appendChild(floatingPinnedRight);
    floatingFilters.appendChild(floatingSpacer);

    header.appendChild(headerMain);
    header.appendChild(floatingFilters);

    const body = document.createElement("div");
    body.className = "ol-grid__body";
    body.dataset.testid = bodyViewportTestId;
    body.setAttribute("role", "rowgroup");

    const bodyInner = document.createElement("div");
    bodyInner.className = "ol-grid__body-inner";

    const bodyPinnedLeft = document.createElement("div");
    bodyPinnedLeft.className = "ol-grid__body-pinned-left";

    const centerScroll = document.createElement("div");
    centerScroll.className = "ol-grid__center-scroll";
    centerScroll.dataset.testid = centerViewportTestId;

    const centerInner = document.createElement("div");
    centerInner.className = "ol-grid__center-inner";

    const rowsPinned = document.createElement("div");
    rowsPinned.className = "ol-grid__rows ol-grid__rows--pinned";

    const rowsCenter = document.createElement("div");
    rowsCenter.className = "ol-grid__rows ol-grid__rows--center";

    const bodyPinnedRight = document.createElement("div");
    bodyPinnedRight.className = "ol-grid__body-pinned-right";

    const bodySpacer = document.createElement("div");
    bodySpacer.className = "ol-grid__layout-spacer";
    bodySpacer.setAttribute("aria-hidden", "true");

    const rowsPinnedRight = document.createElement("div");
    rowsPinnedRight.className = "ol-grid__rows ol-grid__rows--pinned-right";

    bodyPinnedLeft.appendChild(rowsPinned);
    centerInner.appendChild(rowsCenter);
    centerScroll.appendChild(centerInner);
    bodyPinnedRight.appendChild(rowsPinnedRight);
    bodyInner.appendChild(bodyPinnedLeft);
    bodyInner.appendChild(centerScroll);
    bodyInner.appendChild(bodyPinnedRight);
    bodyInner.appendChild(bodySpacer);
    body.appendChild(bodyInner);

    root.appendChild(header);
    root.appendChild(body);

    const paginationPanel = document.createElement("div");
    paginationPanel.className = "ol-grid__pagination-host";
    // Hidden until PaginationModule enables pagination on first render frame.
    paginationPanel.hidden = true;
    root.appendChild(paginationPanel);

    const overlay = document.createElement("div");
    overlay.className = "ol-grid__overlay";
    overlay.hidden = true;
    overlay.style.display = "none";
    overlay.setAttribute("aria-live", "polite");
    root.appendChild(overlay);

    const sentinelBefore = createFocusSentinel("before");
    const sentinelAfter = createFocusSentinel("after");
    host.appendChild(sentinelBefore);
    host.appendChild(root);
    host.appendChild(sentinelAfter);

    this.root = root;
    this.sentinelBefore = sentinelBefore;
    this.sentinelAfter = sentinelAfter;
    this.header = header;
    this.headerMain = headerMain;
    this.headerPinnedLeft = headerPinnedLeft;
    this.headerCenter = headerCenter;
    this.headerPinnedRight = headerPinnedRight;
    this.headerSpacer = headerSpacer;
    this.headerCenterScroll = headerCenterScroll;
    this.floatingFilters = floatingFilters;
    this.floatingPinnedLeft = floatingPinnedLeft;
    this.floatingCenter = floatingCenter;
    this.floatingCenterRow = floatingCenterRow;
    this.floatingPinnedRight = floatingPinnedRight;
    this.body = body;
    this.bodyInner = bodyInner;
    this.bodyPinnedLeft = bodyPinnedLeft;
    this.bodyPinnedRight = bodyPinnedRight;
    this.bodySpacer = bodySpacer;
    this.centerScroll = centerScroll;
    this.centerInner = centerInner;
    this.rowsPinned = rowsPinned;
    this.rowsCenter = rowsCenter;
    this.rowsPinnedRight = rowsPinnedRight;
    this.overlay = overlay;
    this.paginationPanel = paginationPanel;

    body.addEventListener("scroll", this.handleScroll, { passive: true });
    body.addEventListener("wheel", this.handleBodyWheel, { passive: true });
    body.addEventListener("pointerdown", this.handleBodyPointerDown);
    centerScroll.addEventListener("scroll", this.handleCenterScroll, { passive: true });
    header.addEventListener("click", this.handleHeaderClick);
    header.addEventListener("mousedown", this.handleHeaderMouseDown);
    header.addEventListener("dblclick", this.handleHeaderDblClick);
    bodyInner.addEventListener("click", this.handleRowClick);
    bodyInner.addEventListener("dblclick", this.handleCellDblClick);
    bodyInner.addEventListener("mouseover", this.handleBodyMouseOver);
    bodyInner.addEventListener("mouseleave", this.handleBodyMouseLeave);
      host.addEventListener("focus", this.handleHostFocus);
    host.addEventListener("focusin", this.handleHostFocusIn);
    sentinelBefore.addEventListener("focus", this.handleSentinelBeforeFocus);
    sentinelAfter.addEventListener("focus", this.handleSentinelAfterFocus);
    document.addEventListener("keydown", this.handleKeyDown, true);
    document.addEventListener("mousedown", this.handleDocumentMouseDown);

    this.resizeObserver = new ResizeObserver(() => this.reportViewportSize());
    this.resizeObserver.observe(body);

    this.columnHeaderDnD = createColumnHeaderDnDController(engine, {
      onDragFinished: () => {
        this.hideColumnMoveIndicator();
        document.body.style.cursor = "";
        this.suppressHeaderClick = true;
        queueMicrotask(() => {
          this.suppressHeaderClick = false;
        });
      },
    });

    this.reportViewportSize();
    this.startScrollWatcher();
  }

  unmount(): void {
    this.cleanupResizeListeners();
    this.columnHeaderDnD?.destroy();
    this.columnHeaderDnD = null;
    this.hideColumnMoveIndicator();
    this.removeActiveEditor();
    this.body?.removeEventListener("scroll", this.handleScroll);
    this.body?.removeEventListener("wheel", this.handleBodyWheel);
    this.body?.removeEventListener("pointerdown", this.handleBodyPointerDown);
    this.centerScroll?.removeEventListener("scroll", this.handleCenterScroll);
    this.closeFilterPopup();
    this.header?.removeEventListener("click", this.handleHeaderClick);
    this.header?.removeEventListener("mousedown", this.handleHeaderMouseDown);
    this.header?.removeEventListener("dblclick", this.handleHeaderDblClick);
    this.bodyInner?.removeEventListener("click", this.handleRowClick);
    this.bodyInner?.removeEventListener("dblclick", this.handleCellDblClick);
    this.bodyInner?.removeEventListener("mouseover", this.handleBodyMouseOver);
    this.bodyInner?.removeEventListener("mouseleave", this.handleBodyMouseLeave);
    this.host?.removeEventListener("focus", this.handleHostFocus);
    this.host?.removeEventListener("focusin", this.handleHostFocusIn);
    this.sentinelBefore?.removeEventListener("focus", this.handleSentinelBeforeFocus);
    this.sentinelAfter?.removeEventListener("focus", this.handleSentinelAfterFocus);
    document.removeEventListener("keydown", this.handleKeyDown, true);
    document.removeEventListener("mousedown", this.handleDocumentMouseDown);
    this.resizeObserver?.disconnect();

    if (this.scrollLoopRafId !== null) {
      cancelAnimationFrame(this.scrollLoopRafId);
      this.scrollLoopRafId = null;
    }
    this.scrollWatcherActive = false;
    this.lastKnownDomScrollTop = 0;
    this.lastKnownDomScrollLeft = 0;
    this.scrollVelocityPxMs = 0;
    this.lastVelocityScrollTop = 0;
    this.lastVelocityTime = 0;
    this.scrollbarDragging = false;
    this.nativeScrollbarActive = false;
    this.wheelScrollPending = false;
    this.programmaticScrollDepth = 0;
    this.scrollCommitInProgress = false;
    this.hoveredRowIndex = null;

    this.rowPool.reset();

    this.sentinelBefore?.remove();
    this.sentinelAfter?.remove();
    this.root?.remove();
    this.root = null;
    this.sentinelBefore = null;
    this.sentinelAfter = null;
    this.header = null;
    this.headerPinnedLeft = null;
    this.headerCenter = null;
    this.headerPinnedRight = null;
    this.headerSpacer = null;
    this.headerCenterScroll = null;
    this.headerMain = null;
    this.floatingFilters = null;
    this.floatingPinnedLeft = null;
    this.floatingCenter = null;
    this.floatingCenterRow = null;
    this.floatingPinnedRight = null;
    this.body = null;
    this.bodyInner = null;
    this.bodyPinnedLeft = null;
    this.bodyPinnedRight = null;
    this.bodySpacer = null;
    this.centerScroll = null;
    this.centerInner = null;
    this.rowsPinned = null;
    this.rowsCenter = null;
    this.rowsPinnedRight = null;
    this.frame = null;
    this.host?.classList.remove("ol-grid");
    this.host?.removeAttribute("role");
    this.host?.removeAttribute("tabindex");
    this.host?.style.removeProperty("width");
    this.host?.style.removeProperty("max-width");
    this.host = null;
    this.engine = null;
  }

  renderFrame(frame: RenderFrame): void {
    if (
      !this.header ||
      !this.headerPinnedLeft ||
      !this.headerPinnedRight ||
      !this.headerCenter ||
      !this.headerCenterScroll ||
      !this.floatingFilters ||
      !this.floatingPinnedLeft ||
      !this.floatingCenter ||
      !this.floatingCenterRow ||
      !this.floatingPinnedRight ||
      !this.bodyPinnedLeft ||
      !this.bodyPinnedRight ||
      !this.centerScroll ||
      !this.centerInner ||
      !this.rowsPinned ||
      !this.rowsCenter ||
      !this.rowsPinnedRight ||
      !this.body ||
      !this.bodyInner
    ) {
      return;
    }

    this.frame = frame;
    this.suppressEditorBlur = !!frame.editing;
    this.host?.style.setProperty("--ol-grid-row-height", `${frame.rowHeight}px`);
    this.host?.classList.toggle("ol-grid--floating-filters", frame.showFloatingFilters);
    this.host?.classList.toggle("ol-grid--pagination", !!frame.pagination?.enabled);
    this.host?.style.setProperty("--ol-grid-pinned-left-width", `${frame.pinnedLeftWidth}px`);
    this.host?.style.setProperty("--ol-grid-pinned-right-width", `${frame.pinnedRightWidth}px`);
    this.host!.style.width = `${frame.renderWidth}px`;
    this.host!.style.maxWidth = "100%";

    const centerOverflows = frame.centerWidth > frame.centerViewportWidth;
    const centerScrollWidth = centerOverflows
      ? frame.centerViewportWidth
      : frame.centerWidth;

    this.header!.style.width = `${frame.renderWidth}px`;
    this.bodyInner.style.width = `${frame.renderWidth}px`;
    this.bodyInner.style.height = `${frame.totalHeight}px`;
    this.bodyPinnedLeft.style.width = `${frame.pinnedLeftWidth}px`;
    this.bodyPinnedRight.style.width = `${frame.pinnedRightWidth}px`;
    this.centerScroll.style.width = `${centerScrollWidth}px`;
    this.centerInner.style.width = `${frame.centerWidth}px`;
    this.centerInner.style.height = `${frame.totalHeight}px`;

    const totalHeaderHeight = frame.headerRowCount * frame.headerHeight;
    this.host?.style.setProperty("--ol-grid-header-height", `${frame.headerHeight}px`);
    this.host?.style.setProperty("--ol-grid-header-total-height", `${totalHeaderHeight}px`);

    this.headerPinnedLeft!.style.width = `${frame.pinnedLeftWidth}px`;
    this.headerPinnedRight!.style.width = `${frame.pinnedRightWidth}px`;
    this.headerCenter!.style.width = `${centerScrollWidth}px`;
    this.headerCenterScroll!.style.width = `${frame.centerWidth}px`;
    this.floatingFilters.hidden = !frame.showFloatingFilters;
    this.floatingPinnedLeft.style.width = `${frame.pinnedLeftWidth}px`;
    this.floatingPinnedRight.style.width = `${frame.pinnedRightWidth}px`;
    this.floatingCenter.style.width = `${centerScrollWidth}px`;
    this.floatingCenterRow.style.width = `${frame.centerWidth}px`;
    this.syncHeaderScroll();
    this.syncFloatingFilterScroll();
    this.syncViewportScrollFromStore();

    this.renderHeaderRows(this.headerPinnedLeft!, frame.pinnedLeftHeaderRows, frame, frame.pinnedLeftColumns);
    this.renderHeaderRows(this.headerCenterScroll!, frame.centerHeaderRows, frame, frame.centerColumns, true);
    this.renderHeaderRows(this.headerPinnedRight!, frame.pinnedRightHeaderRows, frame, frame.pinnedRightColumns);
    if (!this.columnHeaderDnD?.isDragActive()) {
      this.columnHeaderDnD?.refresh({
        headerPinnedLeft: this.headerPinnedLeft!,
        headerCenterScroll: this.headerCenterScroll!,
        headerPinnedRight: this.headerPinnedRight!,
        headerRowCount: frame.headerRowCount,
      });
    }
    if (frame.showFloatingFilters) {
      this.renderFloatingFilterSection(this.floatingPinnedLeft, frame.pinnedLeftColumns, frame);
      this.renderFloatingFilterSection(this.floatingCenterRow, frame.centerColumns, frame);
      this.renderFloatingFilterSection(this.floatingPinnedRight, frame.pinnedRightColumns, frame);
    }
    this.syncFilterPopup(frame);
    this.renderRows(frame);
    this.syncOverlays(frame);
    this.syncPaginationPanel(frame);
    this.syncEditor(frame);
    this.syncFocusRing(frame);
    this.syncHostTabIndex(frame);
    this.suppressEditorBlur = false;
  }

  /**
   * Reconcile store scroll with the live viewport. When the DOM moved (native
   * scrollbar / track click), adopt DOM into the store — never reset scrollTop
   * while the user is dragging. When only the store moved (keyboard page,
   * ensureIndexVisible), push store values into the DOM.
   */
  private syncViewportScrollFromStore(): void {
    if (!this.body || !this.engine || this.scrollCommitInProgress) return;

    const { scrollTop, scrollLeft } = this.engine.getStore().getState();
    const domScrollTop = this.body.scrollTop;
    const domScrollLeft = this.centerScroll?.scrollLeft ?? 0;

    const verticalMismatch = domScrollTop !== scrollTop;
    const horizontalMismatch = domScrollLeft !== scrollLeft;

    if (!verticalMismatch && !horizontalMismatch) {
      this.lastKnownDomScrollTop = domScrollTop;
      this.lastKnownDomScrollLeft = domScrollLeft;
      return;
    }

    const domVerticalMoved = domScrollTop !== this.lastKnownDomScrollTop;
    const domHorizontalMoved = domScrollLeft !== this.lastKnownDomScrollLeft;

    if (
      (verticalMismatch && domVerticalMoved) ||
      (horizontalMismatch && domHorizontalMoved)
    ) {
      this.lastKnownDomScrollTop = domScrollTop;
      this.lastKnownDomScrollLeft = domScrollLeft;
      this.dispatchScrollIfChanged(domScrollTop, domScrollLeft);
      return;
    }

    if (verticalMismatch) {
      this.setBodyScrollTop(scrollTop);
    }
    if (horizontalMismatch && this.centerScroll) {
      this.withProgrammaticScroll(() => {
        this.centerScroll!.scrollLeft = scrollLeft;
        this.lastKnownDomScrollLeft = scrollLeft;
      });
      this.syncHeaderScroll();
      this.syncFloatingFilterScroll();
    }
  }

  private withProgrammaticScroll(run: () => void): void {
    this.programmaticScrollDepth++;
    try {
      run();
    } finally {
      this.programmaticScrollDepth--;
    }
  }

  private isProgrammaticScroll(): boolean {
    return this.programmaticScrollDepth > 0;
  }

  private setBodyScrollTop(scrollTop: number): void {
    if (!this.body) return;
    this.withProgrammaticScroll(() => {
      this.body!.scrollTop = scrollTop;
      this.lastKnownDomScrollTop = scrollTop;
    });
  }

  /** True when pointer is over the native vertical scrollbar gutter. */
  private isPointerInVerticalScrollbar(event: { clientX: number; clientY: number }): boolean {
    if (!this.body) return false;
    const scrollbarWidth = this.body.offsetWidth - this.body.clientWidth;
    if (scrollbarWidth <= 0) return false;
    const rect = this.body.getBoundingClientRect();
    return (
      event.clientX >= rect.right - scrollbarWidth &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
  }

  private beginNativeScrollbarInteraction(): void {
    this.nativeScrollbarActive = true;
    this.scrollbarDragging = true;
    const onPointerUp = (): void => {
      this.nativeScrollbarActive = false;
      this.scrollbarDragging = false;
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
    };
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);
  }

  private findRowCell(
    rowIndex: number,
    colId: string,
    frame: RenderFrame,
  ): HTMLElement | null {
    const isPinnedLeft = frame.pinnedLeftColumns.some((column) => column.colId === colId);
    const isPinnedRight = frame.pinnedRightColumns.some((column) => column.colId === colId);
    const rowsContainer = isPinnedLeft
      ? this.rowsPinned
      : isPinnedRight
        ? this.rowsPinnedRight
        : this.rowsCenter;
    const rowEl = rowsContainer?.querySelector<HTMLElement>(
      `:scope > .ol-grid__row[data-row-index="${rowIndex}"]`,
    );
    return (
      rowEl?.querySelector<HTMLElement>(`:scope > .ol-grid__cell[data-col-id="${colId}"]`) ??
      null
    );
  }

  reportRowHeight(_index: number, _height: number): void {
    // Dynamic row height lands in a later phase
  }

  reportColumnWidth(_index: number, _width: number): void {
    // Column resize feedback handled via store refresh
  }

  getCellHost(position: CellPosition): HTMLElement {
    if (!this.root) {
      throw new Error("DomRenderer is not mounted");
    }
    if (this.frame) {
      const cell = this.findRowCell(position.rowIndex, position.colId, this.frame);
      if (cell) return cell;
    }
    return this.root;
  }

  getEditorHost(): HTMLElement {
    const editing = this.frame?.editing;
    if (editing) {
      return this.getCellHost(editing.activeCell);
    }
    if (!this.root) {
      throw new Error("DomRenderer is not mounted");
    }
    return this.root;
  }

  private readonly handleScroll = (): void => {
    if (!this.body || !this.engine) {
      this.flushScrollFromDom();
      return;
    }

    const targetScrollTop = this.body.scrollTop;
    const scrollLeft = this.centerScroll?.scrollLeft ?? 0;
    const storeScrollTop = this.engine.getStore().getState().scrollTop;

    if (!this.isProgrammaticScroll() && targetScrollTop !== storeScrollTop) {
      const rowHeight = this.frame?.rowHeight ?? 32;
      const scrollDeltaPx = Math.abs(targetScrollTop - storeScrollTop);
      if (this.isNativeScrollbarInteraction(scrollDeltaPx, rowHeight)) {
        this.setBodyScrollTop(storeScrollTop);
      }
    }

    this.syncScrollPositionFromDom(targetScrollTop, scrollLeft);
  };

  private readonly handleCenterScroll = (): void => {
    this.flushScrollFromDom();
  };

  /** Read live body scroll into store before the next paint. */
  syncScrollFromViewport(): void {
    this.flushScrollFromDom();
  }

  private flushScrollFromDom(): void {
    if (!this.body || !this.engine) return;
    this.syncScrollPositionFromDom(
      this.body.scrollTop,
      this.centerScroll?.scrollLeft ?? 0,
    );
  }

  /**
   * Sync store + row pool from live DOM scroll. When the virtual range overlaps
   * the warm pool, apply transform immediately; otherwise refresh rows first.
   * On high velocity, non-overlapping jumps, or scrollbar drag, hold native
   * scrollTop until rows are mounted (Tier 2 sync scroll).
   */
  private syncScrollPositionFromDom(scrollTop: number, scrollLeft: number): void {
    if (!this.body || !this.rowsPinned || !this.rowsCenter || !this.rowsPinnedRight || !this.engine) {
      return;
    }

    this.syncHeaderScroll();
    this.syncFloatingFilterScroll();

    const state = this.engine.getStore().getState();
    if (state.scrollTop === scrollTop && state.scrollLeft === scrollLeft) {
      return;
    }

    const rowHeight = this.frame?.rowHeight ?? 32;
    const scrollDeltaFromStore = Math.abs(scrollTop - state.scrollTop);
    const isNativeScrollbarScroll = this.isNativeScrollbarInteraction(
      scrollDeltaFromStore,
      rowHeight,
    );

    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const deltaMs =
      this.lastVelocityTime > 0 ? Math.max(now - this.lastVelocityTime, 1) : 16;
    const scrollDelta = Math.abs(scrollTop - this.lastVelocityScrollTop);
    if (scrollTop !== this.lastVelocityScrollTop) {
      this.scrollVelocityPxMs = scrollDelta / deltaMs;
      this.lastVelocityScrollTop = scrollTop;
      this.lastVelocityTime = now;
    }

    const virtualRange = this.engine.computeVirtualRangeForScrollTop(scrollTop);
    const containers = {
      pinnedLeft: this.rowsPinned,
      center: this.rowsCenter,
      pinnedRight: this.rowsPinnedRight,
    };
    const applied = this.rowPool.getAppliedVirtualRange();
    const needsSyncScroll =
      this.rowPool.hasMountedRows() &&
      shouldSyncScrollBeforePaint({
        appliedRowStart: applied.rowStart,
        appliedRowEnd: applied.rowEnd,
        nextRowStart: virtualRange.rowStart,
        nextRowEnd: virtualRange.rowEnd,
        scrollVelocityPxMs: this.scrollVelocityPxMs,
        isScrollbarDragging: this.scrollbarDragging,
        isNativeScrollbarScroll,
        scrollDeltaPx: scrollDeltaFromStore,
        rowHeight,
      });

    if (needsSyncScroll) {
      this.commitScrollAfterRender(scrollTop, scrollLeft, virtualRange.rowOffset, containers);
      return;
    }

    const hasRowOverlap = this.rowPool.rangeOverlapsApplied(
      virtualRange.rowStart,
      virtualRange.rowEnd,
    );
    const canTransformEarly =
      hasRowOverlap &&
      this.rowPool.hasMountedRows() &&
      applied.rowStart === virtualRange.rowStart;

    if (canTransformEarly) {
      this.rowPool.applyRowOffset(containers, virtualRange.rowOffset);
    }

    this.dispatchScrollIfChanged(scrollTop, scrollLeft);

    if (!canTransformEarly && (!hasRowOverlap || !this.rowPool.hasMountedRows())) {
      this.rowPool.applyRowOffset(containers, virtualRange.rowOffset);
    }
  }

  /**
   * Hold body at the last committed scrollTop, render rows for the target
   * position, then commit native scrollTop in the same turn (no white gap).
   */
  private commitScrollAfterRender(
    targetScrollTop: number,
    scrollLeft: number,
    rowOffset: number,
    containers: { pinnedLeft: HTMLElement; center: HTMLElement; pinnedRight: HTMLElement },
  ): void {
    if (!this.body || !this.engine) return;

    const heldScrollTop = this.engine.getStore().getState().scrollTop;
    this.scrollCommitInProgress = true;
    try {
      if (this.body.scrollTop !== heldScrollTop) {
        this.setBodyScrollTop(heldScrollTop);
      }

      this.engine.warmSyncRowsAtScrollTop(targetScrollTop);

      this.setBodyScrollTop(targetScrollTop);
      this.rowPool.applyRowOffset(containers, rowOffset);
      this.dispatchScrollIfChanged(targetScrollTop, scrollLeft);
    } finally {
      this.scrollCommitInProgress = false;
    }
  }

  private isNativeScrollbarInteraction(scrollDeltaPx: number, rowHeight: number): boolean {
    if (this.nativeScrollbarActive || this.scrollbarDragging) return true;
    if (this.wheelScrollPending) return false;
    if (this.isProgrammaticScroll()) return false;
    return scrollDeltaPx >= rowHeight;
  }

  /** Pre-expand the warm row pool before scrollTop changes (wheel / scrollbar grab). */
  private preSyncPoolForScrollIntent(direction: "up" | "down" | "both"): void {
    if (!this.engine || !this.body) return;

    const scrollTop = this.body.scrollTop;
    this.engine.warmSyncRowsAtScrollTop(scrollTop, overscanForScrollIntent(direction));
  }

  private readonly handleBodyWheel = (event: WheelEvent): void => {
    if (event.deltaY === 0) return;
    this.wheelScrollPending = true;
    this.preSyncPoolForScrollIntent(event.deltaY > 0 ? "down" : "up");
  };

  private readonly handleBodyPointerDown = (event: PointerEvent): void => {
    this.preSyncPoolForScrollIntent("both");
    const isScrollbarGutter = this.isPointerInVerticalScrollbar(event);
    if (isScrollbarGutter || event.target === this.body) {
      if (isScrollbarGutter) {
        // Prevent mousedown from moving keyboard focus to the grid host / first header.
        event.preventDefault();
      }
      this.beginNativeScrollbarInteraction();
    }
  };

  /** Read live scroll into store when it differs from store state. */
  private dispatchScrollIfChanged(scrollTop: number, scrollLeft: number): void {
    if (!this.engine) return;
    const state = this.engine.getStore().getState();
    if (state.scrollTop === scrollTop && state.scrollLeft === scrollLeft) return;
    this.lastKnownDomScrollTop = scrollTop;
    this.lastKnownDomScrollLeft = scrollLeft;
    this.wheelScrollPending = false;
    this.engine.getStore().dispatch({ type: "SET_SCROLL", scrollTop, scrollLeft });
  }

  /** Poll scroll position each frame so DOM scroll updates sync before paint. */
  private startScrollWatcher(): void {
    if (this.scrollWatcherActive) return;
    this.scrollWatcherActive = true;
    this.scheduleScrollWatcherFrame();
  }

  private scheduleScrollWatcherFrame(): void {
    if (!this.scrollWatcherActive || this.scrollLoopRafId !== null) return;

    this.scrollLoopRafId = requestAnimationFrame(() => {
      this.scrollLoopRafId = null;
      if (!this.scrollWatcherActive || !this.body || !this.engine) return;

      this.syncScrollPositionFromDom(
        this.body.scrollTop,
        this.centerScroll?.scrollLeft ?? 0,
      );

      queueMicrotask(() => {
        if (this.scrollWatcherActive) {
          this.scheduleScrollWatcherFrame();
        }
      });
    });
  }

  private syncHeaderScroll(): void {
    if (!this.headerCenterScroll) return;
    const scrollLeft = this.centerScroll?.scrollLeft ?? 0;
    this.headerCenterScroll.style.transform = `translate3d(-${scrollLeft}px, 0, 0)`;
  }

  private syncFloatingFilterScroll(): void {
    if (!this.floatingCenterRow) return;
    const scrollLeft = this.centerScroll?.scrollLeft ?? 0;
    this.floatingCenterRow.style.transform = `translate3d(-${scrollLeft}px, 0, 0)`;
  }

  private closeFilterPopup(): void {
    this.filterPopupCleanup?.();
    this.filterPopupCleanup = null;
  }

  private syncFilterPopup(frame: RenderFrame): void {
    if (!this.engine || !this.host) return;

    const openColId = frame.openFilterColId;
    if (!openColId) {
      this.closeFilterPopup();
      return;
    }

    const existingPopup = this.host.querySelector<HTMLElement>("[data-filter-popup='true']");
    if (existingPopup?.dataset.colId === openColId) {
      return;
    }

    this.closeFilterPopup();

    const column = frame.columns.find((entry) => entry.colId === openColId);
    const filterType = column?.filterType ?? this.engine.getColumnFilterType(openColId);
    if (!column || !filterType) {
      this.engine.closeColumnFilter();
      return;
    }

    const anchor = this.host.querySelector<HTMLElement>(
      `[data-col-id="${openColId}"][role='columnheader']`,
    );
    if (!anchor) return;

    const model =
      frame.filterModel[openColId] ?? this.engine.getDefaultColumnFilterModel(openColId);

    if (filterType === "custom") {
      const colDef = this.engine.getColumnModel().getByColId(openColId)?.def;
      const factory = colDef ? this.engine.resolveCustomFilterFactory(colDef) : undefined;
      if (!factory) {
        this.engine.closeColumnFilter();
        return;
      }

      this.filterPopupCleanup = mountCustomFilterPopup({
        colId: openColId,
        headerName: column.headerName,
        model,
        anchor,
        host: this.host,
        filterParams: column.filterParams,
        createComponent: factory,
        onApply: (nextModel) => {
          this.engine?.applyColumnFilterFromUi(openColId, nextModel, "ui");
        },
        onClose: () => {
          this.engine?.closeColumnFilter();
          this.closeFilterPopup();
        },
      });
      return;
    }

    this.filterPopupCleanup = mountFilterPopup({
      colId: openColId,
      headerName: column.headerName,
      filterType,
      model,
      anchor,
      host: this.host,
      filterParams: column.filterParams,
      onApply: (nextModel) => {
        this.engine?.applyColumnFilterFromUi(openColId, nextModel, "ui");
      },
      onClose: () => {
        this.engine?.closeColumnFilter();
        this.closeFilterPopup();
      },
    });
  }

  private readonly handleHeaderMouseDown = (event: Event): void => {
    const mouseEvent = event as MouseEvent;
    const handle = (mouseEvent.target as HTMLElement | null)?.closest<HTMLElement>(
      "[data-resize-handle]",
    );
    if (handle && this.engine) {
      const colId = handle.closest<HTMLElement>("[data-col-id]")?.dataset.colId;
      if (!colId) return;

      event.preventDefault();
      event.stopPropagation();

      const column = this.frame?.columns.find((col) => col.colId === colId);
      if (!column) return;

      this.resizeState = {
        colId,
        startX: mouseEvent.clientX,
        startWidth: column.width,
      };

      document.addEventListener("mousemove", this.handleResizeMouseMove);
      document.addEventListener("mouseup", this.handleResizeMouseUp);
    }
  };

  private readonly handleHeaderDblClick = (event: Event): void => {
    const mouseEvent = event as MouseEvent;
    const handle = (mouseEvent.target as HTMLElement | null)?.closest<HTMLElement>(
      "[data-resize-handle]",
    );
    if (!handle || !this.engine) return;

    const colId = handle.closest<HTMLElement>("[data-col-id]")?.dataset.colId;
    if (!colId) return;

    event.preventDefault();
    event.stopPropagation();
    this.engine.autoSizeColumn(colId);
  };

  private readonly handleResizeMouseMove = (event: MouseEvent): void => {
    if (!this.resizeState || !this.engine) return;
    const delta = event.clientX - this.resizeState.startX;
    const nextWidth = this.resizeState.startWidth + delta;
    this.engine.resizeColumn(this.resizeState.colId, nextWidth, false);
  };

  private readonly handleResizeMouseUp = (): void => {
    if (this.resizeState && this.engine) {
      const column = this.engine.getColumnModel().getByColId(this.resizeState.colId);
      if (column) {
        this.engine.resizeColumn(this.resizeState.colId, column.width, true);
      }
    }
    this.cleanupResizeListeners();
  };

  private cleanupResizeListeners(): void {
    document.removeEventListener("mousemove", this.handleResizeMouseMove);
    document.removeEventListener("mouseup", this.handleResizeMouseUp);
    this.resizeState = null;
  }

  private showColumnMoveIndicator(): void {
    if (!this.host || this.columnMoveIndicator) return;
    const indicator = document.createElement("div");
    indicator.className = "ol-grid__column-move-indicator";
    indicator.setAttribute("aria-hidden", "true");
    this.host.appendChild(indicator);
    this.columnMoveIndicator = indicator;
    document.body.style.cursor = "grabbing";
  }

  private hideColumnMoveIndicator(): void {
    this.columnMoveIndicator?.remove();
    this.columnMoveIndicator = null;
  }

  private readonly handleHeaderClick = (event: Event): void => {
    const mouseEvent = event as MouseEvent;
    if (this.suppressHeaderClick) return;
    if ((mouseEvent.target as HTMLElement | null)?.closest("[data-resize-handle]")) return;

    const filterButton = (mouseEvent.target as HTMLElement | null)?.closest<HTMLElement>(
      "[data-filter-button]",
    );
    if (filterButton && this.engine) {
      event.stopPropagation();
      const colId = filterButton.dataset.colId;
      if (!colId) return;
      this.engine.setFocusedHeader(colId);
      this.engine.openColumnFilter(colId);
      this.focusHeader(colId);
      return;
    }

    const headerCheckbox = (mouseEvent.target as HTMLElement | null)?.closest<HTMLElement>(
      "[data-header-select-all]",
    );
    if (headerCheckbox && this.engine) {
      event.stopPropagation();
      this.engine.toggleHeaderCheckbox();
      return;
    }

    const target = (mouseEvent.target as HTMLElement | null)?.closest<HTMLElement>(
      "[data-col-id][role='columnheader']",
    );
    if (!target || !this.engine) return;

    const engine = this.engine;
    const colId = target.dataset.colId;
    if (!colId) return;

    event.stopPropagation();

    const sortable = target.dataset.sortable === "true";
    engine.getStore().batch(() => {
      engine.setFocusedHeader(colId);
      if (sortable) {
        engine.toggleColumnSort(colId, {
          shiftKey: mouseEvent.shiftKey,
          ctrlKey: mouseEvent.ctrlKey,
          metaKey: mouseEvent.metaKey,
        });
      }
    });

    // Re-render from setFocusedHeader/sort replaces header nodes; syncFocusRing restores focus.
    this.focusHeader(colId);
  };

  private setHoveredRowIndex(rowIndex: number | null): void {
    if (this.hoveredRowIndex === rowIndex) return;
    this.hoveredRowIndex = rowIndex;
    this.syncRowHoverClasses();
  }

  private syncRowHoverClasses(): void {
    const containers = [this.rowsPinned, this.rowsCenter, this.rowsPinnedRight];
    for (const container of containers) {
      if (!container) continue;
      for (const rowEl of container.querySelectorAll<HTMLElement>(".ol-grid__row")) {
        const index = Number(rowEl.dataset.rowIndex);
        rowEl.classList.toggle(
          "ol-grid__row--hover",
          this.hoveredRowIndex !== null && index === this.hoveredRowIndex,
        );
      }
    }
  }

  private readonly handleBodyMouseOver = (event: MouseEvent): void => {
    const rowEl = (event.target as HTMLElement | null)?.closest<HTMLElement>(".ol-grid__row");
    if (!rowEl) return;
    const rowIndex = Number(rowEl.dataset.rowIndex);
    if (Number.isNaN(rowIndex)) return;
    this.setHoveredRowIndex(rowIndex);
  };

  private readonly handleBodyMouseLeave = (event: MouseEvent): void => {
    const related = event.relatedTarget;
    if (related instanceof Node && this.bodyInner?.contains(related)) return;
    this.setHoveredRowIndex(null);
  };

  private readonly handleRowClick = (event: Event): void => {
    if (!this.engine) return;

    const mouseEvent = event as MouseEvent;
    const checkbox = (mouseEvent.target as HTMLElement | null)?.closest<HTMLElement>(
      "[data-selection-checkbox]",
    );
    if (checkbox) {
      event.stopPropagation();
      const rowId = checkbox.closest<HTMLElement>("[data-row-id]")?.dataset.rowId;
      if (rowId) {
        this.engine.toggleRowCheckbox(rowId);
      }
      return;
    }

    const cellEl = (mouseEvent.target as HTMLElement | null)?.closest<HTMLElement>(
      "[data-col-id][role='gridcell']",
    );
    const rowEl = cellEl?.closest<HTMLElement>("[data-row-id]");
    if (cellEl && rowEl) {
      const rowIndex = Number(rowEl.dataset.rowIndex);
      const colId = cellEl.dataset.colId;
      if (!Number.isNaN(rowIndex) && colId) {
        this.engine.setFocusedCell(rowIndex, colId);
        this.focusFocusedCell(rowIndex, colId);
      }
    }

    if (!rowEl) return;

    const rowId = rowEl.dataset.rowId;
    if (!rowId) return;

    this.engine.handleRowClick(rowId, mouseEvent);
  };

  private readonly handleCellDblClick = (event: Event): void => {
    if (!this.engine) return;

    const mouseEvent = event as MouseEvent;
    const cellEl = (mouseEvent.target as HTMLElement | null)?.closest<HTMLElement>(
      "[data-col-id][role='gridcell']",
    );
    const rowEl = cellEl?.closest<HTMLElement>("[data-row-id]");
    if (!cellEl || !rowEl) return;

    const rowIndex = Number(rowEl.dataset.rowIndex);
    const colId = cellEl.dataset.colId;
    if (Number.isNaN(rowIndex) || !colId) return;

    event.stopPropagation();
    this.engine.startEditingCell(rowIndex, colId);
  };

  private readonly handleDocumentMouseDown = (event: MouseEvent): void => {
    if (!this.engine || !this.host) return;

    const target = event.target as Node | null;
    if (target && this.host.contains(target)) return;

    const state = this.engine.getStore().getState();
    if (state.editing) {
      const cancel = !this.engine.shouldStopEditingWhenCellsLoseFocus();
      this.engine.stopEditing(cancel);
    }

    if (state.focusedCell) {
      this.engine.clearFocusedCell();
    }

    if (state.focusedHeaderColId) {
      this.engine.setFocusedHeader(null);
    }
  };

  private readonly handleEditorBlur = (): void => {
    if (this.suppressEditorBlur || !this.engine) return;
    this.flushActiveEditorValue();
    const cancel = !this.engine.shouldStopEditingWhenCellsLoseFocus();
    this.engine.stopEditing(cancel);
  };

  private readonly handleEditorTab = (shiftKey: boolean): void => {
    const focused = this.engine?.getFocusedCell();
    logKeyboard("tab (editor)", {
      shiftKey,
      focusedCell: describeCell(focused),
      ...this.keyboardLogContext(),
    });
    this.engine?.stopEditingAndMoveToNextEditable(!shiftKey);
  };

  private readonly handleHostFocus = (): void => {
    if (!this.engine) return;
    if (this.nativeScrollbarActive || this.scrollbarDragging) return;
    if (this.isFilterControl(document.activeElement)) return;
    const state = this.engine.getStore().getState();
    if (state.focusedCell) {
      this.focusCurrentStoreCell();
      return;
    }

    if (state.focusedHeaderColId) {
      this.focusHeader(state.focusedHeaderColId);
      return;
    }

    this.focusFirstGridEntry();
  };

  private readonly handleHostFocusIn = (event: FocusEvent): void => {
    if (!this.engine) return;
    const target = event.target;
    if (!this.isFilterControl(target)) return;

    if (this.engine.getFocusedHeader()) {
      this.engine.setFocusedHeader(null);
    }
    if (this.engine.getFocusedCell()) {
      this.engine.clearFocusedCell();
    }
  };

  private isFilterControl(el: Element | EventTarget | null): boolean {
    if (!el || !(el instanceof Element)) return false;
    return !!el.closest(
      "[data-floating-filter-input], [data-filter-popup-control], [data-filter-popup='true']",
    );
  }

  private isFloatingFilterInput(el: Element | EventTarget | null): el is HTMLInputElement {
    return (
      el instanceof HTMLInputElement &&
      el.dataset.floatingFilterInput === "true"
    );
  }

  private getFloatingFilterInputs(): HTMLInputElement[] {
    if (!this.floatingFilters || this.floatingFilters.hidden) return [];
    const inputs: HTMLInputElement[] = [];
    for (const container of [
      this.floatingPinnedLeft,
      this.floatingCenterRow,
      this.floatingPinnedRight,
    ]) {
      if (!container) continue;
      for (const input of container.querySelectorAll<HTMLInputElement>(
        "[data-floating-filter-input]",
      )) {
        inputs.push(input);
      }
    }
    return inputs;
  }

  private focusFirstGridEntry(): void {
    if (!this.engine) return;

    const filterInputs = this.getFloatingFilterInputs();
    if (filterInputs.length > 0) {
      filterInputs[0]!.focus({ preventScroll: true });
      return;
    }

    const columns = this.engine.getNavigableColumns();
    if (columns.length === 0) return;
    this.engine.setFocusedHeader(columns[0]!.colId);
    this.focusHeader(columns[0]!.colId);
  }

  private handleFilterControlKeyDown(event: KeyboardEvent): void {
    if (!this.engine) return;

    const active = document.activeElement;
    if (!this.isFloatingFilterInput(active) || event.key !== "Tab") return;

    const inputs = this.getFloatingFilterInputs();
    const idx = inputs.indexOf(active);
    if (idx < 0) return;

    if (event.shiftKey && idx === 0) {
      event.preventDefault();
      event.stopPropagation();
      this.exitGridTab("before");
      return;
    }

    if (!event.shiftKey && idx === inputs.length - 1) {
      event.preventDefault();
      event.stopPropagation();
      const headerCols = this.engine.getNavigableColumns();
      if (headerCols.length > 0) {
        this.engine.setFocusedHeader(headerCols[0]!.colId);
        this.focusHeader(headerCols[0]!.colId);
      }
    }
  }

  private readonly handleSentinelBeforeFocus = (): void => {
    this.redirectSentinelFocus("first");
  };

  private readonly handleSentinelAfterFocus = (): void => {
    this.redirectSentinelFocus("last");
  };

  private redirectSentinelFocus(edge: "first" | "last"): void {
    if (!this.engine) return;

    const columns = this.engine.getNavigableColumns();
    if (columns.length === 0) {
      this.host?.focus({ preventScroll: true });
      return;
    }

    if (edge === "first") {
      const filterInputs = this.getFloatingFilterInputs();
      if (filterInputs.length > 0) {
        filterInputs[0]!.focus({ preventScroll: true });
        return;
      }
      this.engine.setFocusedHeader(columns[0]!.colId);
      this.keyboardNavFocusPending = true;
      this.scheduleFocusAfterKeyboardNav();
    } else {
      const rowCount = this.engine.getRowModel().getRowCount();
      if (rowCount === 0) {
        this.host?.focus({ preventScroll: true });
        return;
      }
      this.engine.setFocusedCell(rowCount - 1, columns[columns.length - 1]!.colId);
      this.keyboardNavFocusPending = true;
      this.scheduleFocusAfterKeyboardNav();
    }
  }

  private isKeyboardEventForThisGrid(event: KeyboardEvent): boolean {
    if (!this.host) return false;
    const active = document.activeElement;
    if (active) {
      if (this.isFilterControl(active)) return true;
      if (
        active === this.host ||
        active === this.sentinelBefore ||
        active === this.sentinelAfter ||
        this.host.contains(active)
      ) {
        return true;
      }
    }
    const target = event.target as Node | null;
    if (target && this.isFilterControl(target)) return true;
    return !!(target && this.host.contains(target));
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.engine || !this.host) return;
    if (!this.isKeyboardEventForThisGrid(event)) {
      logKeyboard("keydown skipped", {
        reason: "outside grid",
        key: event.key,
        target: describeElement(event.target as Element),
        ...this.keyboardLogContext(),
      });
      return;
    }

    if (
      this.isFilterControl(document.activeElement) ||
      this.isFilterControl(event.target)
    ) {
      this.handleFilterControlKeyDown(event);
      return;
    }

    const isEditing = !!this.engine.getStore().getState().editing;
    const key = event.key;
    const target = describeElement(event.target as Element);

    if (isEditing) {
      if (event.key === "Escape") {
        logKeyboard("keydown handled", {
          key, target, handled: true, isEditing,
          action: "stopEditing(cancel)",
          ...this.keyboardLogContext(),
        });
        event.preventDefault();
        event.stopPropagation();
        this.engine.stopEditing(true);
        this.focusCurrentStoreCell();
        return;
      }
      if (event.key === "Enter") {
        logKeyboard("keydown handled", {
          key, target, handled: true, isEditing,
          action: "stopEditing(commit)",
          ...this.keyboardLogContext(),
        });
        event.preventDefault();
        event.stopPropagation();
        this.suppressEditorBlur = true;
        this.flushActiveEditorValue();
        this.engine.stopEditing(false);
        this.focusCurrentStoreCell();
        return;
      }
      if (event.key === "Tab") {
        logKeyboard("keydown handled", {
          key, target, handled: true, isEditing,
          action: "tab next editable",
          shiftKey: event.shiftKey,
          focusedCell: describeCell(this.engine.getFocusedCell()),
          ...this.keyboardLogContext(),
        });
        event.preventDefault();
        event.stopPropagation();
        this.suppressEditorBlur = true;
        this.flushActiveEditorValue();
        this.engine.stopEditingAndMoveToNextEditable(!event.shiftKey);
        if (!this.engine.getStore().getState().editing) {
          this.keyboardNavFocusPending = true;
          this.scheduleFocusAfterKeyboardNav();
        }
        return;
      }
      return;
    }

    const active = document.activeElement;
    const isHostFocused = active === this.host;
    const focusedHeaderColId = this.engine.getFocusedHeader();
    const isHeaderFocused = focusedHeaderColId !== null;

    if (isHeaderFocused) {
      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          event.stopPropagation();
          this.engine.moveHeaderFocus(-1);
          this.focusHeader(this.engine.getFocusedHeader()!);
          return;
        case "ArrowRight":
          event.preventDefault();
          event.stopPropagation();
          this.engine.moveHeaderFocus(1);
          this.focusHeader(this.engine.getFocusedHeader()!);
          return;
        case "Enter":
        case "Space": {
          event.preventDefault();
          event.stopPropagation();
          const colId = this.engine.getFocusedHeader();
          if (colId) {
            this.engine.toggleColumnSort(colId, {
              shiftKey: event.shiftKey,
              ctrlKey: event.ctrlKey,
              metaKey: event.metaKey,
            });
          }
          return;
        }
        case "Escape":
          event.preventDefault();
          event.stopPropagation();
          this.engine.setFocusedHeader(null);
          this.host?.focus({ preventScroll: true });
          return;
        case "Tab": {
          const headerCols = this.engine.getNavigableColumns();
          const currentHeaderIdx = headerCols.findIndex(
            (c) => c.colId === focusedHeaderColId,
          );
          if (event.shiftKey) {
            if (currentHeaderIdx > 0) {
              event.preventDefault();
              event.stopPropagation();
              this.engine.moveHeaderFocus(-1);
              this.focusHeader(this.engine.getFocusedHeader()!);
            } else {
              const filterInputs = this.getFloatingFilterInputs();
              if (filterInputs.length > 0) {
                event.preventDefault();
                event.stopPropagation();
                this.engine.setFocusedHeader(null);
                filterInputs[filterInputs.length - 1]!.focus({ preventScroll: true });
              } else {
                // first header → exit grid to previous focusable outside
                event.preventDefault();
                event.stopPropagation();
                this.exitGridTab("before");
              }
            }
          } else {
            event.preventDefault();
            event.stopPropagation();
            if (currentHeaderIdx < headerCols.length - 1) {
              this.engine.moveHeaderFocus(1);
              this.focusHeader(this.engine.getFocusedHeader()!);
            } else {
              // last header → restore prior body cell or first visible body cell
              const rowCount = this.engine.getRowModel().getRowCount();
              this.engine.setFocusedHeader(null);
              if (rowCount > 0) {
                this.flushScrollFromDom();
                this.keyboardNavFocusPending = true;
                this.engine.focusBodyFromHeader();
                this.scheduleFocusAfterKeyboardNav();
              }
            }
          }
          return;
        }
        default:
          break;
      }
    }

    if (!isEditing) {
      switch (event.key) {
        case "ArrowUp":
          logKeyboard("keydown handled", { key, target, handled: true, isEditing, action: "nav up" });
          event.preventDefault();
          event.stopPropagation();
          this.runKeyboardNavigation("up", () => this.engine!.moveFocusedCell(-1, 0));
          break;
        case "ArrowDown":
          logKeyboard("keydown handled", { key, target, handled: true, isEditing, action: "nav down" });
          event.preventDefault();
          event.stopPropagation();
          this.runKeyboardNavigation("down", () => this.engine!.moveFocusedCell(1, 0));
          break;
        case "ArrowLeft":
          logKeyboard("keydown handled", { key, target, handled: true, isEditing, action: "nav left" });
          event.preventDefault();
          event.stopPropagation();
          this.runKeyboardNavigation("left", () => this.engine!.moveFocusedCell(0, -1));
          break;
        case "ArrowRight":
          logKeyboard("keydown handled", { key, target, handled: true, isEditing, action: "nav right" });
          event.preventDefault();
          event.stopPropagation();
          this.runKeyboardNavigation("right", () => this.engine!.moveFocusedCell(0, 1));
          break;
        case "Home":
          logKeyboard("keydown handled", {
            key, target, handled: true, isEditing,
            action: event.ctrlKey || event.metaKey ? "nav home row" : "nav first col",
          });
          event.preventDefault();
          event.stopPropagation();
          this.runKeyboardNavigation(
            event.ctrlKey || event.metaKey ? "home-row" : "home-col",
            () => {
              if (event.ctrlKey || event.metaKey) {
                this.engine!.setFocusedCell(0, this.engine!.getNavigableColumns()[0]?.colId ?? "");
              } else {
                this.engine!.moveFocusedCellToColumn("first");
              }
            },
          );
          break;
        case "End":
          logKeyboard("keydown handled", {
            key, target, handled: true, isEditing,
            action: event.ctrlKey || event.metaKey ? "nav end row" : "nav last col",
          });
          event.preventDefault();
          event.stopPropagation();
          this.runKeyboardNavigation(
            event.ctrlKey || event.metaKey ? "end-row" : "end-col",
            () => {
              if (event.ctrlKey || event.metaKey) {
                const columns = this.engine!.getNavigableColumns();
                const rowCount = this.engine!.getRowModel().getRowCount();
                if (columns.length > 0 && rowCount > 0) {
                  this.engine!.setFocusedCell(rowCount - 1, columns[columns.length - 1]!.colId);
                }
              } else {
                this.engine!.moveFocusedCellToColumn("last");
              }
            },
          );
          break;
        case "PageDown":
          logKeyboard("keydown handled", { key, target, handled: true, isEditing, action: "page down" });
          event.preventDefault();
          event.stopPropagation();
          this.runKeyboardNavigation("pageDown", () => this.engine!.pageFocusedCell("down"));
          break;
        case "PageUp":
          logKeyboard("keydown handled", { key, target, handled: true, isEditing, action: "page up" });
          event.preventDefault();
          event.stopPropagation();
          this.runKeyboardNavigation("pageUp", () => this.engine!.pageFocusedCell("up"));
          break;
        case " ": {
          const focusedCell = this.engine.getFocusedCell();
          if (!focusedCell) break;
          const rowId = this.engine.getRowIdAtDisplayIndex(focusedCell.rowIndex);
          if (!rowId) break;
          logKeyboard("keydown handled", {
            key: "Space",
            target,
            handled: true,
            isEditing,
            action: "toggle row selection",
            rowId,
            ...this.keyboardLogContext(),
          });
          event.preventDefault();
          event.stopPropagation();
          this.engine.toggleRowSelectionByKeyboard(rowId);
          break;
        }
        case "Tab": {
          const focusedCell = this.engine!.getFocusedCell();
          if (event.shiftKey) {
            if (focusedCell) {
              const columns = this.engine!.getNavigableColumns();
              const colIndex = columns.findIndex((c) => c.colId === focusedCell.colId);
              const isFirstCell = colIndex === 0 && focusedCell.rowIndex === 0;
              if (isFirstCell) {
                const headerCols = this.engine!.getNavigableColumns();
                if (headerCols.length > 0) {
                  event.preventDefault();
                  event.stopPropagation();
                  const lastHeaderCol = headerCols[headerCols.length - 1]!.colId;
                  this.engine!.setFocusedHeader(lastHeaderCol);
                  this.keyboardNavFocusPending = true;
                  this.scheduleFocusAfterKeyboardNav();
                }
              } else {
                event.preventDefault();
                event.stopPropagation();
                this.flushScrollFromDom();
                this.keyboardNavFocusPending = true;
                this.engine!.tabNavigate(false);
                this.scheduleFocusAfterKeyboardNav();
              }
            } else if (isHostFocused) {
              event.preventDefault();
              event.stopPropagation();
              this.exitGridTab("before");
            }
          } else {
            if (isHostFocused && !focusedCell && !focusedHeaderColId) {
              const filterInputs = this.getFloatingFilterInputs();
              if (filterInputs.length > 0) {
                event.preventDefault();
                event.stopPropagation();
                filterInputs[0]!.focus({ preventScroll: true });
              } else {
                const headerCols = this.engine!.getNavigableColumns();
                if (headerCols.length > 0) {
                  event.preventDefault();
                  event.stopPropagation();
                  this.engine!.setFocusedHeader(headerCols[0]!.colId);
                  this.keyboardNavFocusPending = true;
                  this.scheduleFocusAfterKeyboardNav();
                }
              }
            } else if (focusedCell) {
              const columns = this.engine!.getNavigableColumns();
              const colIndex = columns.findIndex((c) => c.colId === focusedCell.colId);
              const rowCount = this.engine!.getRowModel().getRowCount();
              const isLastCell =
                colIndex === columns.length - 1 && focusedCell.rowIndex === rowCount - 1;
              if (isLastCell) {
                event.preventDefault();
                event.stopPropagation();
                this.exitGridTab("after");
              } else {
                event.preventDefault();
                event.stopPropagation();
                this.flushScrollFromDom();
                this.keyboardNavFocusPending = true;
                this.engine!.tabNavigate(true);
                this.scheduleFocusAfterKeyboardNav();
              }
            }
          }
          break;
        }
        case "Enter":
        case "F2": {
          logKeyboard("keydown handled", {
            key, target, handled: true, isEditing,
            action: "start edit",
            focusedCell: describeCell(this.engine.getFocusedCell()),
            ...this.keyboardLogContext(),
          });
          event.preventDefault();
          event.stopPropagation();
          this.flushScrollFromDom();
          const focused = this.ensureFocusedCellForKeyboard();
          if (focused) {
            this.engine.startEditingCell(focused.rowIndex, focused.colId);
          }
          break;
        }
        case "Escape": {
          const focusedCell = this.engine.getFocusedCell();
          if (focusedCell) {
            logKeyboard("keydown handled", {
              key, target, handled: true, isEditing,
              action: "clear focus",
              focusedCell: describeCell(focusedCell),
              ...this.keyboardLogContext(),
            });
            event.preventDefault();
            event.stopPropagation();
            this.engine.clearFocusedCell();
          }
          break;
        }
        default:
          break;
      }
    }
  };

  private runKeyboardNavigation(direction: string, action: () => void): void {
    this.flushScrollFromDom();
    const before = this.engine?.getFocusedCell() ?? null;
    const active = document.activeElement;
    if (
      active === this.host ||
      active === this.sentinelBefore ||
      active === this.sentinelAfter
    ) {
      this.ensureFocusedCellForKeyboard();
    }
    logKeyboard("navigate", {
      direction,
      before: describeCell(before ?? this.engine?.getFocusedCell()),
      ...this.keyboardLogContext(),
    });
    this.keyboardNavFocusPending = true;
    action();
    const after = this.engine?.getFocusedCell() ?? null;
    logKeyboard("navigate result", {
      direction,
      after: describeCell(after),
      ...this.keyboardLogContext(),
    });
    this.scheduleFocusAfterKeyboardNav();
  }

  private scheduleFocusAfterKeyboardNav(): void {
    queueMicrotask(() => {
      if (!this.keyboardNavFocusPending) return;
      this.keyboardNavFocusPending = false;
      const focusedHeaderColId = this.engine?.getFocusedHeader();
      if (focusedHeaderColId) {
        this.focusHeader(focusedHeaderColId);
        return;
      }
      this.focusCurrentStoreCell();
    });
  }

  private ensureFocusedCellForKeyboard(): CellPosition | null {
    let focused = this.engine?.getFocusedCell() ?? null;
    if (focused || !this.engine) return focused;

    const columns = this.engine.getNavigableColumns();
    if (columns.length === 0) return null;

    this.engine.setFocusedCell(0, columns[0]!.colId);
    return this.engine.getFocusedCell();
  }

  private focusCurrentStoreCell(): void {
    const focused = this.engine?.getFocusedCell();
    if (focused) {
      logKeyboard("focus store cell", {
        focusedCell: describeCell(focused),
        ...this.keyboardLogContext(),
      });
      this.focusFocusedCell(focused.rowIndex, focused.colId);
    }
  }

  private keyboardLogContext(): { scrollTop: number; active: string } {
    return {
      scrollTop: this.body?.scrollTop ?? 0,
      active: describeElement(document.activeElement),
    };
  }

  private reportViewportSize(): void {
    if (!this.body || !this.engine) return;
    const { clientWidth, clientHeight } = this.body;
    const state = this.engine.getStore().getState();
    if (state.viewportWidth === clientWidth && state.viewportHeight === clientHeight) return;
    this.engine.getStore().dispatch({
      type: "SET_VIEWPORT",
      width: clientWidth,
      height: clientHeight,
    });
  }

  private renderHeaderRows(
    container: HTMLElement,
    rows: RenderHeaderRow[],
    frame: RenderFrame,
    columns: RenderColumn[],
    isCenter = false,
  ): void {
    const focusedHeaderColId = frame.focusedHeaderColId;
    const useGrid = frame.headerRowCount > 1;
    const reuseElements = this.columnHeaderDnD?.isDragActive() ?? false;
    const existingByKey = reuseElements ? this.collectHeaderCellsByKey(container) : null;

    if (useGrid) {
      container.classList.add("ol-grid__header-grid");
      container.style.display = "grid";
      container.style.gridTemplateColumns = columns.map((column) => `${column.width}px`).join(" ");
      container.style.gridTemplateRows = `repeat(${rows.length}, ${frame.headerHeight}px)`;

      const nextChildren: Array<{ el: HTMLElement; gridColumn: number }> = [];
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        for (const cell of rows[rowIndex]!.cells) {
          const el = this.createHeaderCellElement(
            cell,
            frame,
            focusedHeaderColId,
            rowIndex,
            true,
            existingByKey?.get(this.headerCellKey(cell) ?? ""),
          );
          this.applyHeaderCellGridPlacement(el, cell);
          nextChildren.push({ el, gridColumn: cell.gridColumn ?? 0 });
        }
      }
      nextChildren.sort((a, b) => a.gridColumn - b.gridColumn);
      container.replaceChildren(...nextChildren.map((entry) => entry.el));
      return;
    }

    container.classList.remove("ol-grid__header-grid");
    container.style.removeProperty("display");
    container.style.removeProperty("grid-template-columns");
    container.style.removeProperty("grid-template-rows");

    const rowElements = this.syncHeaderRowElements(container, rows.length, isCenter);

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const rowEl = rowElements[rowIndex]!;
      const headerRow = rows[rowIndex]!;
      const nextChildren: HTMLElement[] = [];

      for (const cell of headerRow.cells) {
        nextChildren.push(
          this.createHeaderCellElement(
            cell,
            frame,
            focusedHeaderColId,
            rowIndex,
            false,
            existingByKey?.get(this.headerCellKey(cell) ?? ""),
          ),
        );
      }

      rowEl.replaceChildren(...nextChildren);
    }
  }

  private collectHeaderCellsByKey(container: HTMLElement): Map<string, HTMLElement> {
    const map = new Map<string, HTMLElement>();
    container.querySelectorAll<HTMLElement>('[role="columnheader"]').forEach((el) => {
      const key = el.dataset.colId ?? el.dataset.groupId;
      if (key) map.set(key, el);
    });
    return map;
  }

  private headerCellKey(cell: RenderHeaderCell): string | null {
    if (cell.kind === "group") return cell.groupId ?? null;
    if (cell.kind === "selection") return "__selection__";
    return cell.colId ?? null;
  }

  private applyHeaderCellGridPlacement(el: HTMLElement, cell: RenderHeaderCell): void {
    if (cell.gridColumn == null || cell.gridRow == null) return;

    if (cell.colSpan && cell.colSpan > 1) {
      el.style.gridColumn = `${cell.gridColumn} / span ${cell.colSpan}`;
    } else {
      el.style.gridColumn = String(cell.gridColumn);
    }

    if (cell.rowSpan && cell.rowSpan > 1) {
      el.style.gridRow = `${cell.gridRow} / span ${cell.rowSpan}`;
    } else {
      el.style.gridRow = String(cell.gridRow);
    }
  }

  private syncHeaderRowElements(
    container: HTMLElement,
    rowCount: number,
    isCenter: boolean,
  ): HTMLElement[] {
    const rows: HTMLElement[] = [];
    for (let i = 0; i < rowCount; i++) {
      let row = container.children[i] as HTMLElement | undefined;
      if (!row) {
        row = document.createElement("div");
        row.className = isCenter
          ? "ol-grid__header-row ol-grid__header-row--center"
          : "ol-grid__header-row";
        row.setAttribute("role", "row");
        container.appendChild(row);
      }
      rows.push(row);
    }
    while (container.children.length > rowCount) {
      container.lastElementChild?.remove();
    }
    return rows;
  }

  private createHeaderCellElement(
    cell: RenderHeaderCell,
    frame: RenderFrame,
    focusedHeaderColId: string | null,
    rowIndex: number,
    useGridLayout = false,
    existing?: HTMLElement,
  ): HTMLElement {
    const el = existing ?? document.createElement("div");
    if (!existing) {
      el.className = "ol-grid__header-cell";
      el.setAttribute("role", "columnheader");
    }
    if (!useGridLayout) {
      el.style.width = `${cell.width}px`;
    }

    if (cell.kind === "group") {
      el.classList.add("ol-grid__header-cell--group");
      if (cell.groupId) {
        el.dataset.groupId = cell.groupId;
        el.dataset.testid = headerGroupTestId(cell.groupId);
      }
      const label = document.createElement("span");
      label.className = "ol-grid__header-label";
      label.textContent = cell.headerName;
      el.replaceChildren(label);
      if (!useGridLayout && cell.rowSpan && cell.rowSpan > 1) {
        el.style.height = `${cell.rowSpan * frame.headerHeight}px`;
        el.classList.add("ol-grid__header-cell--row-span");
      }
      return el;
    }

    if (cell.kind === "selection") {
      el.classList.add("ol-grid__header-cell--selection");
      el.dataset.colId = "__selection__";
      el.dataset.testid = headerCellTestId("__selection__");
      el.replaceChildren(this.createHeaderCheckbox(frame.headerCheckboxState ?? "unchecked"));
      if (!useGridLayout && cell.rowSpan && cell.rowSpan > 1) {
        el.style.height = `${cell.rowSpan * frame.headerHeight}px`;
        el.classList.add("ol-grid__header-cell--row-span");
      }
      return el;
    }

    el.dataset.colId = cell.colId ?? "";
    if (cell.colId) el.dataset.testid = headerCellTestId(cell.colId);
    el.dataset.sortable = String(cell.sortable ?? false);
    el.classList.toggle("ol-grid__header-cell--sortable", !!cell.sortable);
    const columnDef = cell.colId
      ? this.engine?.getColumnModel().getByColId(cell.colId)?.def
      : undefined;
    const movable =
      !!columnDef && !columnDef.suppressMovable && !columnDef.lockPosition;
    el.classList.toggle("ol-grid__header-cell--movable", movable);
    el.classList.toggle("ol-grid__header-cell--pinned-left", cell.pinned === "left");
    el.classList.toggle("ol-grid__header-cell--pinned-right", cell.pinned === "right");

    if (!useGridLayout && cell.rowSpan && cell.rowSpan > 1) {
      el.style.height = `${cell.rowSpan * frame.headerHeight}px`;
      el.classList.add("ol-grid__header-cell--row-span");
    }

    const isFocused = focusedHeaderColId === cell.colId;
    el.classList.toggle("ol-grid__header-cell--focused", isFocused);
    el.tabIndex = isFocused ? 0 : -1;

    if (cell.sort === "asc") {
      el.setAttribute("aria-sort", "ascending");
    } else if (cell.sort === "desc") {
      el.setAttribute("aria-sort", "descending");
    } else if (cell.sortable) {
      el.setAttribute("aria-sort", "none");
    }

    const label = document.createElement("span");
    label.className = "ol-grid__header-label";
    label.textContent = cell.headerName;

    const indicator = document.createElement("span");
    indicator.className = "ol-grid__sort-indicator";
    if (cell.colId) indicator.dataset.testid = sortIndicatorTestId(cell.colId);
    fillSortIndicator(
      indicator,
      cell.sort,
      cell.sortIndex,
      countSortedColumns(frame.columns),
    );

    const children: HTMLElement[] = [label, indicator];
    if (cell.filterType && cell.colId) {
      children.push(createFilterButton(cell.colId, !!cell.filterActive));
    }

    const resizeHandle = document.createElement("span");
    resizeHandle.className = "ol-grid__resize-handle";
    resizeHandle.dataset.resizeHandle = "true";
    resizeHandle.setAttribute("aria-hidden", "true");
    children.push(resizeHandle);

    el.replaceChildren(...children);
    return el;
  }

  private renderHeaderSection(
    container: HTMLElement,
    columns: RenderColumn[],
    frame: RenderFrame,
  ): void {
    const focusedHeaderColId = frame.focusedHeaderColId;
    const existing = new Map(
      [...container.children].map((child) => [
        (child as HTMLElement).dataset.colId,
        child as HTMLElement,
      ]),
    );

    const nextChildren: HTMLElement[] = [];
    const sortedColumnCount = countSortedColumns(columns);

    for (const column of columns) {
      let cell = existing.get(column.colId);
      if (!cell) {
        cell = document.createElement("div");
        cell.className = "ol-grid__header-cell";
        cell.setAttribute("role", "columnheader");
      }

      cell.dataset.colId = column.colId;
      cell.dataset.testid = headerCellTestId(column.colId);
      cell.dataset.sortable = String(column.sortable);
      cell.style.width = `${column.width}px`;
      cell.classList.toggle("ol-grid__header-cell--sortable", column.sortable);
      cell.classList.toggle("ol-grid__header-cell--selection", !!column.isSelectionColumn);
      cell.classList.toggle("ol-grid__header-cell--pinned-left", column.pinned === "left");
      cell.classList.toggle("ol-grid__header-cell--pinned-right", column.pinned === "right");

      const isFocused = focusedHeaderColId === column.colId;
      cell.classList.toggle("ol-grid__header-cell--focused", isFocused);
      cell.tabIndex = isFocused ? 0 : -1;

      if (column.isSelectionColumn) {
        cell.removeAttribute("aria-sort");
      } else if (column.sort === "asc") {
        cell.setAttribute("aria-sort", "ascending");
      } else if (column.sort === "desc") {
        cell.setAttribute("aria-sort", "descending");
      } else if (column.sortable) {
        cell.setAttribute("aria-sort", "none");
      } else {
        cell.removeAttribute("aria-sort");
      }

      if (column.isSelectionColumn) {
        cell.replaceChildren(this.createHeaderCheckbox(frame.headerCheckboxState ?? "unchecked"));
        nextChildren.push(cell);
        continue;
      }

      const label = document.createElement("span");
      label.className = "ol-grid__header-label";
      label.textContent = column.headerName;

      const indicator = document.createElement("span");
      indicator.className = "ol-grid__sort-indicator";
      indicator.dataset.testid = sortIndicatorTestId(column.colId);
      fillSortIndicator(indicator, column.sort, column.sortIndex, sortedColumnCount);

      const children: HTMLElement[] = [label, indicator];
      if (column.filterType) {
        children.push(createFilterButton(column.colId, !!column.filterActive));
      }

      const resizeHandle = document.createElement("span");
      resizeHandle.className = "ol-grid__resize-handle";
      resizeHandle.dataset.resizeHandle = "true";
      resizeHandle.setAttribute("aria-hidden", "true");
      children.push(resizeHandle);

      cell.replaceChildren(...children);
      nextChildren.push(cell);
    }

    container.replaceChildren(...nextChildren);
  }

  private renderFloatingFilterSection(
    container: HTMLElement,
    columns: RenderColumn[],
    frame: RenderFrame,
  ): void {
    if (!this.engine) return;

    const existing = new Map(
      [...container.children].map((child) => [
        (child as HTMLElement).dataset.colId,
        child as HTMLElement,
      ]),
    );

    const nextChildren: HTMLElement[] = [];

    for (const column of columns) {
      let cell = existing.get(column.colId);
      if (!cell) {
        cell = document.createElement("div");
        cell.className = "ol-grid__floating-filter-host";
        cell.dataset.colId = column.colId;
      }

      cell.style.width = `${column.width}px`;

      if (column.floatingFilter && column.filterType) {
        const input = cell.querySelector<HTMLInputElement>("[data-floating-filter-input]");
        if (!input) {
          cell.replaceChildren(
            createFloatingFilterInput(
              column,
              frame.filterModel[column.colId],
              (model) => {
                this.engine?.applyColumnFilterFromUi(
                  column.colId,
                  model as FilterModelEntry | null,
                  "floating",
                );
              },
            ),
          );
        } else {
          syncFloatingFilterInputValue(input, column, frame.filterModel[column.colId]);
        }
      } else {
        cell.replaceChildren();
      }

      nextChildren.push(cell);
    }

    const needsReplace =
      nextChildren.length !== container.children.length ||
      nextChildren.some((child, index) => child !== container.children[index]);
    if (needsReplace) {
      container.replaceChildren(...nextChildren);
    }
  }

  private syncOverlays(frame: RenderFrame): void {
    if (!this.overlay) return;

    const showLoading = !!frame.overlayLoading;
    const showNoRows = !!frame.overlayNoRows;
    const showError = !!frame.overlayError;

    if (!showLoading && !showNoRows && !showError) {
      this.overlay.hidden = true;
      this.overlay.style.display = "none";
      this.overlay.replaceChildren();
      this.overlay.className = "ol-grid__overlay";
      return;
    }

    this.overlay.hidden = false;
    this.overlay.style.display = "flex";
    this.overlay.replaceChildren();

    if (showError) {
      this.overlay.className = "ol-grid__overlay ol-grid__overlay--error";
      this.overlay.textContent =
        frame.overlayErrorTemplate?.replace("{error}", frame.overlayError ?? "Error") ??
        frame.overlayError ??
        "Error loading rows";
      return;
    }

    if (showLoading) {
      this.overlay.className = "ol-grid__overlay ol-grid__overlay--loading";
      this.overlay.textContent = frame.overlayLoadingTemplate ?? "Loading…";
      return;
    }

    this.overlay.className = "ol-grid__overlay ol-grid__overlay--no-rows";
    this.overlay.textContent = frame.overlayNoRowsTemplate ?? "No rows to show";
  }

  private syncPaginationPanel(frame: RenderFrame): void {
    if (!this.paginationPanel || !this.engine) return;

    const panel = createPaginationPanel(frame, {
      onFirst: () => this.engine?.paginationGoToFirstPage(),
      onPrevious: () => this.engine?.paginationGoToPreviousPage(),
      onNext: () => this.engine?.paginationGoToNextPage(),
      onLast: () => this.engine?.paginationGoToLastPage(),
      onPageSizeChange: (size) => this.engine?.paginationSetPageSize(size),
    });

    if (!panel) {
      this.paginationPanel.hidden = true;
      this.paginationPanel.replaceChildren();
      return;
    }

    this.paginationPanel.hidden = false;
    this.paginationPanel.replaceChildren(panel);
  }

  private renderRows(frame: RenderFrame): void {
    if (!this.rowsPinned || !this.rowsCenter || !this.rowsPinnedRight) return;

    this.rowPool.syncFrame(
      {
        pinnedLeft: this.rowsPinned,
        center: this.rowsCenter,
        pinnedRight: this.rowsPinnedRight,
      },
      frame,
      (rowEl, row, renderFrame, width) => {
        rowEl.dataset.rowId = row.id;
        rowEl.dataset.rowIndex = String(row.rowIndex);
        rowEl.dataset.testid = rowTestId(row.rowIndex);
        rowEl.style.height = `${renderFrame.rowHeight}px`;
        rowEl.style.width = `${width}px`;
        rowEl.classList.toggle("ol-grid__row--selected", row.selected);
        rowEl.classList.toggle(
          "ol-grid__row--hover",
          this.hoveredRowIndex !== null && row.rowIndex === this.hoveredRowIndex,
        );
        rowEl.setAttribute("aria-rowindex", String(row.rowIndex + 1));
        rowEl.setAttribute("aria-selected", String(row.selected));
      },
      (rowEl, section, row, renderFrame) => {
        const pinnedLeftCount = renderFrame.pinnedLeftColumns.length;
        const centerCount = renderFrame.centerColumns.length;
        const cells =
          section === "pinnedLeft"
            ? row.cells.slice(0, pinnedLeftCount)
            : section === "center"
              ? row.cells.slice(pinnedLeftCount, pinnedLeftCount + centerCount)
              : row.cells.slice(pinnedLeftCount + centerCount);
        const columns =
          section === "pinnedLeft"
            ? renderFrame.pinnedLeftColumns
            : section === "center"
              ? renderFrame.centerColumns
              : renderFrame.pinnedRightColumns;
        const colIndexOffset =
          section === "pinnedLeft"
            ? 0
            : section === "center"
              ? pinnedLeftCount
              : pinnedLeftCount + centerCount;

        this.patchRowCells(
          rowEl,
          cells,
          columns,
          row,
          renderFrame.focusedCell,
          renderFrame.editing,
          colIndexOffset,
        );
      },
    );
  }

  private patchRowCells(
    rowEl: HTMLElement,
    cells: RenderFrame["rows"][number]["cells"],
    columns: RenderColumn[],
    row: RenderFrame["rows"][number],
    focused: RenderFrame["focusedCell"],
    editing: RenderFrame["editing"],
    colIndexOffset: number,
  ): void {
    const existing = new Map(
      [...rowEl.children].map((child) => [
        (child as HTMLElement).dataset.colId,
        child as HTMLElement,
      ]),
    );

    const nextCells: HTMLElement[] = cells.map((cell, index) => {
      const column = columns[index];
      let cellEl = existing.get(cell.colId);
      if (!cellEl) {
        cellEl = document.createElement("div");
        cellEl.className = "ol-grid__cell";
        cellEl.setAttribute("role", "gridcell");
      }

      cellEl.style.width = `${column?.width ?? 0}px`;
      cellEl.dataset.colId = cell.colId;
      cellEl.dataset.testid = bodyCellTestId(row.rowIndex, cell.colId);
      cellEl.classList.toggle("ol-grid__cell--selection", !!cell.isSelectionColumn);

      const isFocused = focused?.rowIndex === row.rowIndex && focused.colId === cell.colId;
      const isEditing =
        editing?.activeCell.rowIndex === row.rowIndex && editing.activeCell.colId === cell.colId;

      cellEl.classList.toggle("ol-grid__cell--focused", isFocused && !isEditing);
      cellEl.classList.toggle("ol-grid__cell--editing", isEditing);
      cellEl.classList.toggle("ol-grid__cell--stub", !!cell.isStub);
      cellEl.classList.toggle("ol-grid__cell--stub-failed", !!cell.stubFailed);
      cellEl.setAttribute("aria-colindex", String(colIndexOffset + index + 1));
      cellEl.tabIndex = isFocused ? 0 : -1;

      if (cell.isSelectionColumn) {
        let checkbox = cellEl.querySelector<HTMLInputElement>(".ol-grid__selection-checkbox");
        if (!checkbox) {
          cellEl.replaceChildren(this.createCheckbox(row.selected, row.rowIndex));
          checkbox = cellEl.querySelector<HTMLInputElement>(".ol-grid__selection-checkbox");
        } else {
          if (checkbox.checked !== row.selected) {
            checkbox.checked = row.selected;
          }
          checkbox.dataset.testid = rowCheckboxTestId(row.rowIndex);
        }
      } else if (cell.isStub) {
        cellEl.replaceChildren();
        if (cell.stubFailed) {
          cellEl.textContent = cell.value || "Error";
        } else {
          const skeleton = document.createElement("span");
          skeleton.className = "ol-grid__cell-stub";
          skeleton.setAttribute("aria-hidden", "true");
          cellEl.appendChild(skeleton);
        }
      } else if (isEditing) {
        // Editor DOM is owned by syncEditor — do not clear on refresh (avoids blur → stopEditing).
      } else if (cell.useFrameworkRenderer) {
        if (cellEl.childElementCount > 0) {
          cellEl.replaceChildren();
        }
      } else if (cell.cellRenderer && this.engine) {
        const colDef = this.engine.getColumnModel().getByColId(cell.colId)?.def;
        const node = this.engine.getRowNode(row.id);
        if (colDef && node) {
          const params: CellRendererParams = {
            value: getCellValueFromEngine(this.engine, node, colDef),
            data: node.data as never,
            node,
            colDef,
            api: this.engine.getApi(),
            context: this.engine.getOptions().context ?? null,
            rowIndex: row.rowIndex,
          };
          const renderer =
            typeof cell.cellRenderer === "string"
              ? this.engine.getCellRenderer(cell.cellRenderer)
              : cell.cellRenderer;
          const registry = new Map<string, CellRendererFn>();
          if (typeof cell.cellRenderer === "string" && renderer) {
            registry.set(cell.cellRenderer, renderer);
          }
          renderCellContent(cellEl, params, renderer ? cell.cellRenderer : undefined, registry, cell.value);
        } else if (cellEl.textContent !== cell.value) {
          cellEl.textContent = cell.value;
        }
      } else if (cellEl.textContent !== cell.value) {
        cellEl.textContent = cell.value;
      }

      return cellEl;
    });

    reconcileRowOrder(rowEl, nextCells);
  }

  private syncEditor(frame: RenderFrame): void {
    const editing = frame.editing;
    if (!editing) {
      this.removeActiveEditor();
      return;
    }

    const cellEl = this.findRowCell(
      editing.activeCell.rowIndex,
      editing.activeCell.colId,
      frame,
    );
    if (!cellEl || !this.engine) return;

    const column = this.engine.getColumnModel().getByColId(editing.activeCell.colId);
    const colDef = column?.def;
    if (!colDef) return;

    const editingCell = frame.rows
      .find((row) => row.rowIndex === editing.activeCell.rowIndex)
      ?.cells.find((cell) => cell.colId === editing.activeCell.colId);

    if (editingCell?.useFrameworkEditor) {
      if (this.activeEditorType !== "framework") {
        this.removeActiveEditor();
        cellEl.replaceChildren();
        this.activeEditorType = "framework";
        this.activeEditor = cellEl;
      }
      return;
    }

    if (usesCustomCellEditor(colDef, this.engine)) {
      const existingCustom =
        this.activeCustomEditor &&
        this.activeEditor === this.activeCustomEditor.element &&
        this.activeEditorType === "custom";

      if (!existingCustom) {
        this.removeActiveEditor();
        const mount = mountCustomCellEditor(
          this.engine,
          colDef,
          editing.activeCell.colId,
          editing.activeCell.rowIndex,
          editing.editValue,
          (value) => {
            this.engine?.updateEditValue(value);
          },
          (cancel) => {
            this.engine?.stopEditing(cancel);
          },
        );
        if (!mount) return;

        mount.element.addEventListener("blur", () => {
          this.handleEditorBlur();
        }, true);
        cellEl.replaceChildren(mount.element);
        this.activeEditor = mount.element;
        this.activeEditorType = "custom";
        this.activeCustomEditor = mount;
      }

      if (document.activeElement !== this.activeEditor) {
        const focusable = this.activeEditor?.querySelector<HTMLElement>(
          "input, select, textarea, button, [tabindex]:not([tabindex='-1'])",
        );
        (focusable ?? this.activeEditor)?.focus();
      }
      return;
    }

    const editorType = resolveCellEditorType(colDef);
    const existingEditor = cellEl.querySelector<HTMLElement>(":scope > .ol-grid__cell-editor");
    const editorMatchesCell =
      existingEditor &&
      existingEditor === this.activeEditor &&
      this.activeEditorType === editorType;

    let editor = existingEditor;
    if (!editorMatchesCell) {
      editor = createCellEditorElement({
        value: editing.editValue,
        colDef,
        onValueChange: (value) => {
          this.engine?.updateEditValue(value);
        },
        onStopEditing: (cancel) => {
          this.engine?.stopEditing(cancel);
        },
        onTab: (shiftKey) => {
          this.handleEditorTab(shiftKey);
        },
      });
      editor.addEventListener("blur", () => {
        this.handleEditorBlur();
      });
      cellEl.replaceChildren(editor);
      this.activeEditor = editor;
      this.activeEditorType = editorType;
    }

    const currentValue = readEditorValue(editor!);
    if (currentValue !== editing.editValue) {
      if (editor instanceof HTMLInputElement || editor instanceof HTMLSelectElement) {
        editor.value = editing.editValue;
      } else if (editor instanceof HTMLTextAreaElement) {
        editor.value = editing.editValue;
      }
    }

    if (document.activeElement !== editor) {
      editor!.focus();
      if (editor instanceof HTMLInputElement && editor.type !== "number") {
        editor.select();
      }
    }
  }

  private removeActiveEditor(): void {
    this.activeCustomEditor?.destroy();
    this.activeCustomEditor = null;
    this.activeEditor = null;
    this.activeEditorType = null;
  }

  private flushActiveEditorValue(): void {
    if (!this.engine || !this.activeCustomEditor) return;
    this.engine.updateEditValue(
      readCustomCellEditorValue(this.activeCustomEditor.editor),
    );
  }

  private syncHostTabIndex(frame: RenderFrame): void {
    if (!this.host) return;
    this.host.tabIndex = frame.focusedCell || frame.focusedHeaderColId ? -1 : 0;
  }

  private isFocusableElement(el: HTMLElement): boolean {
    if (el.getAttribute("aria-hidden") === "true") return false;
    if ("disabled" in el && (el as HTMLInputElement).disabled) return false;

    if (el.tabIndex < 0) {
      const tag = el.tagName;
      if (tag === "A" && el.hasAttribute("href")) return true;
      return tag === "BUTTON" || tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";
    }
    return true;
  }

  private getTabOrderedFocusables(): HTMLElement[] {
    const candidates = document.querySelectorAll<HTMLElement>(
      'a[href], button, input, select, textarea, [tabindex]',
    );
    return [...candidates].filter((el) => this.isFocusableElement(el));
  }

  private findOutsideFocusTarget(direction: "before" | "after"): HTMLElement | null {
    if (!this.host) return null;

    const ordered = this.getTabOrderedFocusables();
    const active = document.activeElement as HTMLElement | null;

    if (active && ordered.includes(active)) {
      const activeIndex = ordered.indexOf(active);
      if (direction === "before") {
        for (let i = activeIndex - 1; i >= 0; i--) {
          if (!this.host.contains(ordered[i]!)) return ordered[i]!;
        }
      } else {
        for (let i = activeIndex + 1; i < ordered.length; i++) {
          if (!this.host.contains(ordered[i]!)) return ordered[i]!;
        }
      }
      return null;
    }

    const gridIndices = ordered
      .map((el, index) => (this.host!.contains(el) ? index : -1))
      .filter((index) => index >= 0);
    if (gridIndices.length === 0) return null;

    const boundaryIndex =
      direction === "before" ? gridIndices[0]! : gridIndices[gridIndices.length - 1]!;
    if (direction === "before") {
      for (let i = boundaryIndex - 1; i >= 0; i--) {
        if (!this.host.contains(ordered[i]!)) return ordered[i]!;
      }
    } else {
      for (let i = boundaryIndex + 1; i < ordered.length; i++) {
        if (!this.host.contains(ordered[i]!)) return ordered[i]!;
      }
    }
    return null;
  }

  private focusOutsideGrid(direction: "before" | "after"): void {
    const target = this.findOutsideFocusTarget(direction);
    if (target) {
      target.focus({ preventScroll: true });
      return;
    }

    if (!this.host) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && this.host.contains(active)) {
      active.blur();
    }
  }

  private exitGridTab(direction: "before" | "after"): void {
    if (!this.host || !this.engine) return;
    const target = this.findOutsideFocusTarget(direction);
    this.engine.setFocusedHeader(null);
    this.engine.clearFocusedCell();
    this.host.tabIndex = -1;
    if (target) {
      target.focus({ preventScroll: true });
      return;
    }
    const active = document.activeElement;
    if (active instanceof HTMLElement && this.host.contains(active)) {
      active.blur();
    }
  }

  private syncFocusRing(frame: RenderFrame): void {
    if (frame.editing) return;

    if (this.isFilterControl(document.activeElement)) {
      return;
    }

    const active = document.activeElement;
    const focusInsideGrid =
      active === this.host ||
      active === this.sentinelBefore ||
      active === this.sentinelAfter ||
      active === this.body ||
      active === this.bodyInner ||
      (this.host != null && this.host.contains(active));

    if (frame.focusedHeaderColId) {
      // Always restore header DOM focus when a header is focused in store.
      // Re-renders (e.g. after sort on header click) replace header nodes and drop focus;
      // without this, Tab keydown is not routed to the grid handler.
      this.focusHeader(frame.focusedHeaderColId);
      return;
    }

    const focused = frame.focusedCell;
    if (!focused) return;

    if (focusInsideGrid || this.keyboardNavFocusPending) {
      this.focusFocusedCell(focused.rowIndex, focused.colId);
    }
  }

  private focusFocusedCell(rowIndex: number, colId: string): void {
    if (!this.frame) {
      logKeyboard("focus cell skipped", { rowIndex, colId, reason: "no frame" });
      return;
    }
    const cellEl = this.findRowCell(rowIndex, colId, this.frame);
    if (cellEl) {
      const alreadyFocused = document.activeElement === cellEl;
      if (!alreadyFocused) {
        cellEl.focus({ preventScroll: true });
      }
      logKeyboard("focus cell", {
        rowIndex,
        colId,
        domFound: true,
        alreadyFocused,
        focusResult: describeElement(document.activeElement),
        ...this.keyboardLogContext(),
      });
      return;
    }

    const active = document.activeElement;
    if (
      active === this.host ||
      active === this.sentinelBefore ||
      active === this.sentinelAfter ||
      (active !== null && !this.host?.contains(active))
    ) {
      this.host?.focus({ preventScroll: true });
    }
    logKeyboard("focus cell", {
      rowIndex,
      colId,
      domFound: false,
      fallback: describeElement(document.activeElement),
      ...this.keyboardLogContext(),
    });
  }

  private focusHeader(colId: string): void {
    if (!this.frame) return;
    const cellEl = this.header?.querySelector<HTMLElement>(
      `[data-col-id="${colId}"][role="columnheader"]`,
    );
    if (cellEl && document.activeElement !== cellEl) {
      cellEl.focus({ preventScroll: true });
    }
  }

  private createCheckbox(checked: boolean, rowIndex: number): HTMLElement {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "ol-grid__selection-checkbox";
    input.dataset.selectionCheckbox = "true";
    input.dataset.testid = rowCheckboxTestId(rowIndex);
    input.checked = checked;
    input.tabIndex = -1;
    input.setAttribute("aria-label", this.frame?.localeText.selectRow ?? "Select Row");
    return input;
  }

  private createHeaderCheckbox(state: "checked" | "unchecked" | "indeterminate"): HTMLElement {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "ol-grid__selection-checkbox ol-grid__selection-checkbox--header";
    input.dataset.headerSelectAll = "true";
    input.dataset.testid = headerCheckboxTestId;
    input.checked = state === "checked";
    input.indeterminate = state === "indeterminate";
    input.tabIndex = -1;
    input.setAttribute("aria-label", this.frame?.localeText.selectAll ?? "Select All");
    return input;
  }
}

export function createDomRenderer(): DomRenderer {
  return new DomRenderer();
}

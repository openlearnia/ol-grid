import type {
  CellPosition,
  CellRendererFn,
  CellRendererParams,
  GridEngine,
  RenderColumn,
  RenderFrame,
  RendererAdapter,
} from "@ol-grid/core";
import { getCellValue } from "@ol-grid/core";
import themeCss from "./theme.css";
import { renderCellContent } from "./cell-renderer.js";
import {
  createCellEditorElement,
  readEditorValue,
  resolveCellEditorType,
  type ProvidedCellEditorType,
} from "./cell-editors.js";

const THEME_STYLE_ID = "ol-grid-dom-theme";

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

export class DomRenderer implements RendererAdapter {
  readonly type = "dom" as const;

  private host: HTMLElement | null = null;
  private root: HTMLElement | null = null;
  private header: HTMLElement | null = null;
  private headerPinnedLeft: HTMLElement | null = null;
  private headerCenter: HTMLElement | null = null;
  private headerPinnedRight: HTMLElement | null = null;
  private headerCenterRow: HTMLElement | null = null;
  private body: HTMLElement | null = null;
  private bodyInner: HTMLElement | null = null;
  private bodyPinnedLeft: HTMLElement | null = null;
  private bodyPinnedRight: HTMLElement | null = null;
  private centerScroll: HTMLElement | null = null;
  private centerInner: HTMLElement | null = null;
  private rowsPinned: HTMLElement | null = null;
  private rowsCenter: HTMLElement | null = null;
  private rowsPinnedRight: HTMLElement | null = null;
  private engine: GridEngine | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private frame: RenderFrame | null = null;
  private scrollRaf: number | null = null;
  private activeEditor: HTMLElement | null = null;
  private activeEditorType: ProvidedCellEditorType | null = null;
  private suppressEditorBlur = false;
  private resizeState: {
    colId: string;
    startX: number;
    startWidth: number;
  } | null = null;

  mount(host: HTMLElement, engine: GridEngine): void {
    ensureThemeStyles();
    this.host = host;
    this.engine = engine;

    host.classList.add("ol-grid");
    host.setAttribute("role", "grid");
    host.tabIndex = 0;
    host.style.setProperty("--ol-grid-row-height", `${engine.getRowHeight()}px`);

    const root = document.createElement("div");
    root.className = "ol-grid__root";

    const header = document.createElement("div");
    header.className = "ol-grid__header";
    header.setAttribute("role", "rowgroup");

    const headerPinnedLeft = document.createElement("div");
    headerPinnedLeft.className = "ol-grid__header-pinned-left";
    headerPinnedLeft.setAttribute("role", "row");

    const headerCenter = document.createElement("div");
    headerCenter.className = "ol-grid__header-center";

    const headerCenterRow = document.createElement("div");
    headerCenterRow.className = "ol-grid__header-row ol-grid__header-row--center";
    headerCenterRow.setAttribute("role", "row");
    headerCenter.appendChild(headerCenterRow);

    const headerPinnedRight = document.createElement("div");
    headerPinnedRight.className = "ol-grid__header-pinned-right";
    headerPinnedRight.setAttribute("role", "row");

    header.appendChild(headerPinnedLeft);
    header.appendChild(headerCenter);
    header.appendChild(headerPinnedRight);

    const body = document.createElement("div");
    body.className = "ol-grid__body";
    body.setAttribute("role", "rowgroup");

    const bodyInner = document.createElement("div");
    bodyInner.className = "ol-grid__body-inner";

    const bodyPinnedLeft = document.createElement("div");
    bodyPinnedLeft.className = "ol-grid__body-pinned-left";

    const centerScroll = document.createElement("div");
    centerScroll.className = "ol-grid__center-scroll";

    const centerInner = document.createElement("div");
    centerInner.className = "ol-grid__center-inner";

    const rowsPinned = document.createElement("div");
    rowsPinned.className = "ol-grid__rows ol-grid__rows--pinned";

    const rowsCenter = document.createElement("div");
    rowsCenter.className = "ol-grid__rows ol-grid__rows--center";

    const bodyPinnedRight = document.createElement("div");
    bodyPinnedRight.className = "ol-grid__body-pinned-right";

    const rowsPinnedRight = document.createElement("div");
    rowsPinnedRight.className = "ol-grid__rows ol-grid__rows--pinned-right";

    bodyPinnedLeft.appendChild(rowsPinned);
    centerInner.appendChild(rowsCenter);
    centerScroll.appendChild(centerInner);
    bodyPinnedRight.appendChild(rowsPinnedRight);
    bodyInner.appendChild(bodyPinnedLeft);
    bodyInner.appendChild(centerScroll);
    bodyInner.appendChild(bodyPinnedRight);
    body.appendChild(bodyInner);

    root.appendChild(header);
    root.appendChild(body);
    host.appendChild(root);

    this.root = root;
    this.header = header;
    this.headerPinnedLeft = headerPinnedLeft;
    this.headerCenter = headerCenter;
    this.headerPinnedRight = headerPinnedRight;
    this.headerCenterRow = headerCenterRow;
    this.body = body;
    this.bodyInner = bodyInner;
    this.bodyPinnedLeft = bodyPinnedLeft;
    this.bodyPinnedRight = bodyPinnedRight;
    this.centerScroll = centerScroll;
    this.centerInner = centerInner;
    this.rowsPinned = rowsPinned;
    this.rowsCenter = rowsCenter;
    this.rowsPinnedRight = rowsPinnedRight;

    body.addEventListener("scroll", this.handleScroll, { passive: true });
    centerScroll.addEventListener("scroll", this.handleCenterScroll, { passive: true });
    header.addEventListener("click", this.handleHeaderClick);
    header.addEventListener("mousedown", this.handleHeaderMouseDown);
    header.addEventListener("dblclick", this.handleHeaderDblClick);
    bodyInner.addEventListener("click", this.handleRowClick);
    bodyInner.addEventListener("dblclick", this.handleCellDblClick);
    host.addEventListener("keydown", this.handleKeyDown, true);
    host.addEventListener("focus", this.handleHostFocus);
    document.addEventListener("mousedown", this.handleDocumentMouseDown);

    this.resizeObserver = new ResizeObserver(() => this.reportViewportSize());
    this.resizeObserver.observe(body);

    this.reportViewportSize();
  }

  unmount(): void {
    this.cleanupResizeListeners();
    this.removeActiveEditor();
    this.body?.removeEventListener("scroll", this.handleScroll);
    this.centerScroll?.removeEventListener("scroll", this.handleCenterScroll);
    this.header?.removeEventListener("click", this.handleHeaderClick);
    this.header?.removeEventListener("mousedown", this.handleHeaderMouseDown);
    this.header?.removeEventListener("dblclick", this.handleHeaderDblClick);
    this.bodyInner?.removeEventListener("click", this.handleRowClick);
    this.bodyInner?.removeEventListener("dblclick", this.handleCellDblClick);
    this.host?.removeEventListener("keydown", this.handleKeyDown, true);
    this.host?.removeEventListener("focus", this.handleHostFocus);
    document.removeEventListener("mousedown", this.handleDocumentMouseDown);
    this.resizeObserver?.disconnect();
    if (this.scrollRaf !== null) {
      cancelAnimationFrame(this.scrollRaf);
      this.scrollRaf = null;
    }

    this.root?.remove();
    this.root = null;
    this.header = null;
    this.headerPinnedLeft = null;
    this.headerCenter = null;
    this.headerPinnedRight = null;
    this.headerCenterRow = null;
    this.body = null;
    this.bodyInner = null;
    this.bodyPinnedLeft = null;
    this.bodyPinnedRight = null;
    this.centerScroll = null;
    this.centerInner = null;
    this.rowsPinned = null;
    this.rowsCenter = null;
    this.rowsPinnedRight = null;
    this.frame = null;
    this.host?.classList.remove("ol-grid");
    this.host?.removeAttribute("role");
    this.host?.removeAttribute("tabindex");
    this.host = null;
    this.engine = null;
  }

  renderFrame(frame: RenderFrame): void {
    if (
      !this.headerPinnedLeft ||
      !this.headerPinnedRight ||
      !this.headerCenterRow ||
      !this.bodyPinnedLeft ||
      !this.bodyPinnedRight ||
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
    this.host?.style.setProperty("--ol-grid-pinned-left-width", `${frame.pinnedLeftWidth}px`);
    this.host?.style.setProperty("--ol-grid-pinned-right-width", `${frame.pinnedRightWidth}px`);

    this.bodyInner.style.height = `${frame.totalHeight}px`;
    this.bodyPinnedLeft.style.width = `${frame.pinnedLeftWidth}px`;
    this.bodyPinnedRight.style.width = `${frame.pinnedRightWidth}px`;
    this.centerInner.style.width = `${frame.centerWidth}px`;
    this.centerInner.style.height = `${frame.totalHeight}px`;

    this.headerPinnedLeft.style.width = `${frame.pinnedLeftWidth}px`;
    this.headerPinnedRight.style.width = `${frame.pinnedRightWidth}px`;
    this.headerCenterRow.style.width = `${frame.centerWidth}px`;
    this.syncHeaderScroll();
    this.syncBodyScroll();

    this.renderHeaderSection(this.headerPinnedLeft, frame.pinnedLeftColumns, frame);
    this.renderHeaderSection(this.headerCenterRow, frame.centerColumns, frame);
    this.renderHeaderSection(this.headerPinnedRight, frame.pinnedRightColumns, frame);
    this.syncCenterScroll(frame);
    this.renderRows(frame);
    this.syncEditor(frame);
    this.syncFocusRing(frame);
    this.suppressEditorBlur = false;
  }

  private syncBodyScroll(): void {
    if (!this.body || !this.engine) return;
    const scrollTop = this.engine.getStore().getState().scrollTop;
    if (this.body.scrollTop !== scrollTop) {
      this.body.scrollTop = scrollTop;
    }
  }

  private syncCenterScroll(frame: RenderFrame): void {
    if (!this.centerScroll || !this.engine) return;
    const scrollLeft = this.engine.getStore().getState().scrollLeft;
    if (this.centerScroll.scrollLeft !== scrollLeft) {
      this.centerScroll.scrollLeft = scrollLeft;
    }
    void frame;
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
    this.dispatchScrollState();
  };

  private readonly handleCenterScroll = (): void => {
    this.dispatchScrollState();
  };

  private dispatchScrollState(): void {
    if (!this.body || !this.engine) return;
    if (this.scrollRaf !== null) return;

    this.scrollRaf = requestAnimationFrame(() => {
      this.scrollRaf = null;
      if (!this.body || !this.engine) return;
      const scrollTop = this.body.scrollTop;
      const scrollLeft = this.centerScroll?.scrollLeft ?? 0;
      this.syncHeaderScroll();
      const state = this.engine.getStore().getState();
      if (state.scrollTop === scrollTop && state.scrollLeft === scrollLeft) return;
      this.engine.getStore().dispatch({ type: "SET_SCROLL", scrollTop, scrollLeft });
    });
  }

  private syncHeaderScroll(): void {
    if (!this.headerCenterRow) return;
    const scrollLeft = this.centerScroll?.scrollLeft ?? 0;
    this.headerCenterRow.style.transform = `translate3d(-${scrollLeft}px, 0, 0)`;
  }

  private readonly handleHeaderMouseDown = (event: Event): void => {
    const mouseEvent = event as MouseEvent;
    const handle = (mouseEvent.target as HTMLElement | null)?.closest<HTMLElement>(
      "[data-resize-handle]",
    );
    if (!handle || !this.engine) return;

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

  private readonly handleHeaderClick = (event: Event): void => {
    const mouseEvent = event as MouseEvent;
    if ((mouseEvent.target as HTMLElement | null)?.closest("[data-resize-handle]")) return;

    const headerCheckbox = (mouseEvent.target as HTMLElement | null)?.closest<HTMLElement>(
      "[data-header-select-all]",
    );
    if (headerCheckbox && this.engine) {
      event.stopPropagation();
      this.engine.toggleHeaderCheckbox();
      return;
    }

    const target = (mouseEvent.target as HTMLElement | null)?.closest<HTMLElement>(
      "[data-col-id]",
    );
    if (!target || !this.engine) return;

    const colId = target.dataset.colId;
    const sortable = target.dataset.sortable === "true";
    if (!colId || !sortable) return;

    event.stopPropagation();
    this.engine.toggleColumnSort(colId);
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
    if (!this.engine.getStore().getState().editing) return;

    const target = event.target as Node | null;
    if (target && this.host.contains(target)) return;

    const cancel = !this.engine.shouldStopEditingWhenCellsLoseFocus();
    this.engine.stopEditing(cancel);
  };

  private readonly handleEditorBlur = (): void => {
    if (this.suppressEditorBlur || !this.engine) return;
    const cancel = !this.engine.shouldStopEditingWhenCellsLoseFocus();
    this.engine.stopEditing(cancel);
  };

  private readonly handleEditorTab = (shiftKey: boolean): void => {
    this.engine?.stopEditingAndMoveToNextEditable(!shiftKey);
  };

  private readonly handleHostFocus = (): void => {
    if (!this.engine) return;
    const state = this.engine.getStore().getState();
    if (state.focusedCell) return;

    const columns = this.engine.getNavigableColumns();
    if (columns.length === 0) return;
    this.engine.setFocusedCell(0, columns[0]!.colId);
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.engine) return;

    const state = this.engine.getStore().getState();
    const isEditing = !!state.editing;

    if (isEditing) {
      if (event.key === "Escape") {
        event.preventDefault();
        this.engine.stopEditing(true);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        this.engine.stopEditing(false);
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        this.engine.stopEditingAndMoveToNextEditable(!event.shiftKey);
        return;
      }
      return;
    }

    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        this.engine.moveFocusedCell(-1, 0);
        break;
      case "ArrowDown":
        event.preventDefault();
        this.engine.moveFocusedCell(1, 0);
        break;
      case "ArrowLeft":
        event.preventDefault();
        this.engine.moveFocusedCell(0, -1);
        break;
      case "ArrowRight":
        event.preventDefault();
        this.engine.moveFocusedCell(0, 1);
        break;
      case "Home":
        event.preventDefault();
        if (event.ctrlKey || event.metaKey) {
          this.engine.setFocusedCell(0, this.engine.getNavigableColumns()[0]?.colId ?? "");
        } else {
          this.engine.moveFocusedCellToColumn("first");
        }
        break;
      case "End":
        event.preventDefault();
        if (event.ctrlKey || event.metaKey) {
          const columns = this.engine.getNavigableColumns();
          const rowCount = this.engine.getRowModel().getRowCount();
          if (columns.length > 0 && rowCount > 0) {
            this.engine.setFocusedCell(rowCount - 1, columns[columns.length - 1]!.colId);
          }
        } else {
          this.engine.moveFocusedCellToColumn("last");
        }
        break;
      case "PageDown":
        event.preventDefault();
        this.engine.pageFocusedCell("down");
        break;
      case "PageUp":
        event.preventDefault();
        this.engine.pageFocusedCell("up");
        break;
      case "Enter":
      case "F2": {
        event.preventDefault();
        const focused = state.focusedCell;
        if (focused) {
          this.engine.startEditingCell(focused.rowIndex, focused.colId);
        }
        break;
      }
      case "Escape":
        if (state.focusedCell) {
          event.preventDefault();
          this.engine.getStore().dispatch({ type: "SET_FOCUSED_CELL", focusedCell: null });
        }
        break;
      default:
        break;
    }
  };

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

  private renderHeaderSection(
    container: HTMLElement,
    columns: RenderColumn[],
    frame: RenderFrame,
  ): void {
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
        cell.className = "ol-grid__header-cell";
        cell.setAttribute("role", "columnheader");
      }

      cell.dataset.colId = column.colId;
      cell.dataset.sortable = String(column.sortable);
      cell.style.width = `${column.width}px`;
      cell.classList.toggle("ol-grid__header-cell--sortable", column.sortable);
      cell.classList.toggle("ol-grid__header-cell--selection", !!column.isSelectionColumn);
      cell.classList.toggle("ol-grid__header-cell--pinned-left", column.pinned === "left");
      cell.classList.toggle("ol-grid__header-cell--pinned-right", column.pinned === "right");

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
      indicator.textContent =
        column.sort === "asc" ? "▲" : column.sort === "desc" ? "▼" : "";

      const resizeHandle = document.createElement("span");
      resizeHandle.className = "ol-grid__resize-handle";
      resizeHandle.dataset.resizeHandle = "true";
      resizeHandle.setAttribute("aria-hidden", "true");

      cell.replaceChildren(label, indicator, resizeHandle);
      nextChildren.push(cell);
    }

    container.replaceChildren(...nextChildren);
    void frame;
  }

  private renderRows(frame: RenderFrame): void {
    if (!this.rowsPinned || !this.rowsCenter || !this.rowsPinnedRight) return;

    const pinnedLeftCount = frame.pinnedLeftColumns.length;
    const centerCount = frame.centerColumns.length;
    const pinnedRightCount = frame.pinnedRightColumns.length;
    const pinnedExisting = new Map(
      [...this.rowsPinned.children].map((child) => [
        (child as HTMLElement).dataset.rowId,
        child as HTMLElement,
      ]),
    );
    const centerExisting = new Map(
      [...this.rowsCenter.children].map((child) => [
        (child as HTMLElement).dataset.rowId,
        child as HTMLElement,
      ]),
    );

    const pinnedRightExisting = new Map(
      [...this.rowsPinnedRight.children].map((child) => [
        (child as HTMLElement).dataset.rowId,
        child as HTMLElement,
      ]),
    );

    const nextPinned: HTMLElement[] = [];
    const nextCenter: HTMLElement[] = [];
    const nextPinnedRight: HTMLElement[] = [];
    const focused = frame.focusedCell;
    const editing = frame.editing;

    for (const row of frame.rows) {
      const pinnedCells = row.cells.slice(0, pinnedLeftCount);
      const centerCells = row.cells.slice(pinnedLeftCount, pinnedLeftCount + centerCount);
      const pinnedRightCells = row.cells.slice(pinnedLeftCount + centerCount);
      const pinnedColumns = frame.pinnedLeftColumns;
      const centerColumns = frame.centerColumns;
      const pinnedRightColumns = frame.pinnedRightColumns;

      let pinnedRowEl = pinnedExisting.get(row.id);
      if (!pinnedRowEl) {
        pinnedRowEl = document.createElement("div");
        pinnedRowEl.className = "ol-grid__row";
        pinnedRowEl.setAttribute("role", "row");
      }

      let centerRowEl = centerExisting.get(row.id);
      if (!centerRowEl) {
        centerRowEl = document.createElement("div");
        centerRowEl.className = "ol-grid__row";
        centerRowEl.setAttribute("role", "row");
      }

      let pinnedRightRowEl = pinnedRightExisting.get(row.id);
      if (!pinnedRightRowEl) {
        pinnedRightRowEl = document.createElement("div");
        pinnedRightRowEl.className = "ol-grid__row";
        pinnedRightRowEl.setAttribute("role", "row");
      }

      for (const rowEl of [pinnedRowEl, centerRowEl, pinnedRightRowEl]) {
        rowEl.dataset.rowId = row.id;
        rowEl.dataset.rowIndex = String(row.rowIndex);
        rowEl.style.height = `${frame.rowHeight}px`;
        rowEl.classList.toggle("ol-grid__row--selected", row.selected);
        rowEl.setAttribute("aria-rowindex", String(row.rowIndex + 1));
        rowEl.setAttribute("aria-selected", String(row.selected));
      }

      pinnedRowEl.style.width = `${frame.pinnedLeftWidth}px`;
      centerRowEl.style.width = `${frame.centerWidth}px`;
      pinnedRightRowEl.style.width = `${frame.pinnedRightWidth}px`;

      pinnedRowEl.replaceChildren(
        ...this.renderRowCells(pinnedRowEl, pinnedCells, pinnedColumns, row, focused, editing, 0),
      );
      centerRowEl.replaceChildren(
        ...this.renderRowCells(
          centerRowEl,
          centerCells,
          centerColumns,
          row,
          focused,
          editing,
          pinnedLeftCount,
        ),
      );
      pinnedRightRowEl.replaceChildren(
        ...this.renderRowCells(
          pinnedRightRowEl,
          pinnedRightCells,
          pinnedRightColumns,
          row,
          focused,
          editing,
          pinnedLeftCount + centerCount,
        ),
      );

      nextPinned.push(pinnedRowEl);
      nextCenter.push(centerRowEl);
      nextPinnedRight.push(pinnedRightRowEl);
    }

    this.rowsPinned.replaceChildren(...nextPinned);
    this.rowsCenter.replaceChildren(...nextCenter);
    this.rowsPinnedRight.replaceChildren(...nextPinnedRight);
    const rowTransform = `translate3d(0, ${frame.rowOffset}px, 0)`;
    this.rowsPinned.style.transform = rowTransform;
    this.rowsCenter.style.transform = rowTransform;
    this.rowsPinnedRight.style.transform = rowTransform;
  }

  private renderRowCells(
    rowEl: HTMLElement,
    cells: RenderFrame["rows"][number]["cells"],
    columns: RenderColumn[],
    row: RenderFrame["rows"][number],
    focused: RenderFrame["focusedCell"],
    editing: RenderFrame["editing"],
    colIndexOffset: number,
  ): HTMLElement[] {
    const existing = new Map(
      [...rowEl.children].map((child) => [
        (child as HTMLElement).dataset.colId,
        child as HTMLElement,
      ]),
    );

    return cells.map((cell, index) => {
      const column = columns[index];
      let cellEl = existing.get(cell.colId);
      if (!cellEl) {
        cellEl = document.createElement("div");
        cellEl.className = "ol-grid__cell";
        cellEl.setAttribute("role", "gridcell");
      }

      cellEl.style.width = `${column?.width ?? 0}px`;
      cellEl.dataset.colId = cell.colId;
      cellEl.classList.toggle("ol-grid__cell--selection", !!cell.isSelectionColumn);

      const isFocused = focused?.rowIndex === row.rowIndex && focused.colId === cell.colId;
      const isEditing =
        editing?.activeCell.rowIndex === row.rowIndex && editing.activeCell.colId === cell.colId;

      cellEl.classList.toggle("ol-grid__cell--focused", isFocused && !isEditing);
      cellEl.classList.toggle("ol-grid__cell--editing", isEditing);
      cellEl.setAttribute("aria-colindex", String(colIndexOffset + index + 1));
      cellEl.tabIndex = isFocused ? 0 : -1;

      if (cell.isSelectionColumn) {
        cellEl.replaceChildren(this.createCheckbox(row.selected));
      } else if (isEditing) {
        // Editor DOM is owned by syncEditor — do not clear on refresh (avoids blur → stopEditing).
      } else if (cell.useFrameworkRenderer) {
        cellEl.replaceChildren();
      } else if (cell.cellRenderer && this.engine) {
        const colDef = this.engine.getColumnModel().getByColId(cell.colId)?.def;
        const node = this.engine.getRowModel().getRowAt(row.rowIndex);
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
        } else {
          cellEl.textContent = cell.value;
        }
      } else {
        cellEl.textContent = cell.value;
      }

      return cellEl;
    });
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
    this.activeEditor = null;
    this.activeEditorType = null;
  }

  private syncFocusRing(frame: RenderFrame): void {
    if (frame.editing) return;
    const focused = frame.focusedCell;
    if (!focused) return;

    const active = document.activeElement;
    const focusInsideGrid =
      active === this.host || (this.host != null && this.host.contains(active));

    if (focusInsideGrid) {
      this.focusFocusedCell(focused.rowIndex, focused.colId);
    }
  }

  private focusFocusedCell(rowIndex: number, colId: string): void {
    if (!this.frame) return;
    const cellEl = this.findRowCell(rowIndex, colId, this.frame);
    if (cellEl && document.activeElement !== cellEl) {
      cellEl.focus({ preventScroll: true });
    }
  }

  private createCheckbox(checked: boolean): HTMLElement {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "ol-grid__selection-checkbox";
    input.dataset.selectionCheckbox = "true";
    input.checked = checked;
    input.setAttribute("aria-label", "Select row");
    return input;
  }

  private createHeaderCheckbox(state: "checked" | "unchecked" | "indeterminate"): HTMLElement {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "ol-grid__selection-checkbox ol-grid__selection-checkbox--header";
    input.dataset.headerSelectAll = "true";
    input.checked = state === "checked";
    input.indeterminate = state === "indeterminate";
    input.setAttribute("aria-label", "Select all rows");
    return input;
  }
}

export function createDomRenderer(): DomRenderer {
  return new DomRenderer();
}

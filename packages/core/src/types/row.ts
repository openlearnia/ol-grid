export interface RowNode<TData = unknown> {
  id: string;
  data: TData | undefined;
  rowIndex: number;
  level: number;
  parent?: RowNode<TData>;
  childrenAfterGroup?: RowNode<TData>[];
  expanded: boolean;
  selected: boolean;
  group: boolean;
  aggData?: Record<string, unknown>;
  stub?: boolean;
}

export type RowModelType = "clientSide" | "infinite" | "serverSide";

export interface RowModelMeta {
  loading?: boolean;
  error?: string | null;
}

import type { ReactNode } from 'react';

/** How many rows a server-paged report asks for at a time. */
export const PAGE_SIZE = 10;

export type Column<T> = {
  Header: string;
  accessor: string;
  Cell: (props: { row: { original: T; }; }) => ReactNode;
  /** Paragon passes these straight through to the `th`/`td` it renders. */
  headerClassName?: string;
  cellClassName?: string;
};

/** What every report table needs from the page: the query's state and the controls' callbacks. */
export interface ReportTableProps<T> {
  columns: Column<T>[];
  data?: { count: number; results: T[]; };
  isPending: boolean;
  isError: boolean;
  error?: unknown;
  search: string;
  page: number;
  onSearch: (value: string) => void;
  onPageChange: (page: number) => void;
  emptyMessage: string;
}

/** What a server-paged table needs from the tab that owns the search box. */
export interface TableProps {
  search: string;
  onSearch: (value: string) => void;
}

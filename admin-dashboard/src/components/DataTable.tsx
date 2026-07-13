import React from 'react';
import { ChevronDown } from 'lucide-react';

interface TableColumn<T> {
  key: keyof T;
  label: string;
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  error?: string | null;
  onRowClick?: (row: T) => void;
  rowActionComponent?: (row: T) => React.ReactNode;
}

export const DataTable = React.forwardRef<HTMLDivElement, DataTableProps<any>>(
  (
    {
      columns,
      data,
      isLoading = false,
      error = null,
      onRowClick,
      rowActionComponent,
    },
    ref
  ) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64 text-text-secondary">
          <div className="animate-spin">⏳ Loading...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-64 text-danger">
          <div>❌ {error}</div>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-text-secondary">
          <div>📭 No data found</div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className="overflow-x-auto border border-border rounded-lg"
      >
        <table className="w-full">
          <thead>
            <tr className="bg-surface border-b border-border">
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className="px-6 py-3 text-left text-sm font-semibold text-text-primary"
                  style={{ width: column.width }}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && <ChevronDown size={16} />}
                  </div>
                </th>
              ))}
              {rowActionComponent && (
                <th className="px-6 py-3 text-center text-sm font-semibold text-text-primary">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={index}
                className="border-b border-border hover:bg-accent transition-colors cursor-pointer"
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className="px-6 py-4 text-sm text-text-primary"
                  >
                    {column.render
                      ? column.render(row[column.key], row, index)
                      : String(row[column.key])}
                  </td>
                ))}
                {rowActionComponent && (
                  <td
                    className="px-6 py-4 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {rowActionComponent(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
);

DataTable.displayName = 'DataTable';

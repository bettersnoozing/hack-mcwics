import type { ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface SoftTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  stickyHeader?: boolean;
  onRowClick?: (row: T) => void;
  className?: string;
}

export function SoftTable<T>({
  columns,
  data,
  keyExtractor,
  stickyHeader = false,
  onRowClick,
  className = '',
}: SoftTableProps<T>) {
  return (
    <div className={`overflow-x-auto rounded-2xl border border-warmGray-100 bg-white ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className={`border-b border-warmGray-100 bg-warmGray-50/70 ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left font-medium text-warmGray-500 ${col.className ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-warmGray-50 transition-colors hover:bg-warmGray-50/50 ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3 ${col.className ?? ''}`}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

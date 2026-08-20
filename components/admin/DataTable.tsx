"use client";

import React, { ReactNode, useMemo } from "react";
import styles from "@/styles/components/_adminTable.module.scss";
import DataTableRow from "./DataTableRow";

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any, index?: number) => ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  emptyMessage?: string;
  renderExpandedRow?: (row: any) => ReactNode;
  expandedRowId?: string | null;
}

export default function DataTable({
  columns,
  data,
  emptyMessage = "No data available",
  renderExpandedRow,
  expandedRowId,
}: DataTableProps) {
  // Memoize columns to prevent unnecessary re-renders
  const memoizedColumns = useMemo(() => columns, [columns]);

  return (
    <div className={styles.dataTable}>
      <table className={styles.table}>
        <thead>
          <tr>
            {memoizedColumns.map((column) => (
              <th key={column.key} className={styles.tableHeader}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className={styles.tableCell}
                style={{ textAlign: "center", padding: "2rem" }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <DataTableRow
                key={row.id || `row-${index}`}
                row={row}
                columns={memoizedColumns}
                index={index}
                expandedRowId={expandedRowId}
                renderExpandedRow={renderExpandedRow}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}


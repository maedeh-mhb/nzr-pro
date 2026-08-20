"use client";

import { memo, Fragment } from "react";
import styles from "@/styles/components/_adminTable.module.scss";

interface DataTableRowProps {
  row: any;
  columns: Array<{
    key: string;
    label: string;
    render?: (value: any, row: any, index?: number) => React.ReactNode;
  }>;
  index: number;
  expandedRowId?: string | null;
  renderExpandedRow?: (row: any) => React.ReactNode;
}

const DataTableRow = memo(function DataTableRow({
  row,
  columns,
  index,
  expandedRowId,
  renderExpandedRow,
}: DataTableRowProps) {
  return (
    <Fragment>
      <tr className={styles.tableRow}>
        {columns.map((column) => {
          const cellValue = row[column.key];
          const rendered = column.render
            ? column.render(cellValue, row, index)
            : cellValue ?? "";
          return (
            <td
              key={`${row.id || index}-${column.key}`}
              className={styles.tableCell}
            >
              {rendered}
            </td>
          );
        })}
      </tr>
      {renderExpandedRow && expandedRowId === row.id && (
        <Fragment>{renderExpandedRow(row)}</Fragment>
      )}
    </Fragment>
  );
});

export default DataTableRow;


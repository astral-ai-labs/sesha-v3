"use client";

/* ==========================================================================*/
// DashboardDataTable.tsx — Data table for organization dashboard metrics
/* ==========================================================================*/
// Purpose: Display a pageable, searchable, filterable dashboard of organization
//          metrics using TanStack React-Table and shadcn/ui components.
// Sections: Imports, Types, Component, Helpers, Exports
/* ==========================================================================*/

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// React core ---------------------------------------------------------------
import React from "react";

// External Packages --------------------------------------------------------
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  useReactTable,
  ColumnDef,
} from "@tanstack/react-table";

// Local Modules ------------------------------------------------------------
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { DashboardRowData, columns } from "./columns";

/* ==========================================================================*/
// Types
/* ==========================================================================*/

interface DashboardDataTableProps {
  /** Array of dashboard row data to render. */
  data: DashboardRowData[];
  /** Organization name for summary display. */
  organizationName?: string;
  /** Optional summary statistics (total runs, total cost, avg cost per run) */
  summary?: {
    totalRuns: number;
    totalCostUsd: number;
    avgCostPerRun: number;
  };
  /** Optional filters for future use */
  filters?: unknown;
  /** Optional users for future use */
  users?: Array<{ id: string; name: string }>;
  /** Date range filter handlers */
  onDateRangeChange?: (fromDate: string, toDate: string) => void;
  /** User filter handler */
  onUserFilterChange?: (userId: string) => void;
  /** Length filter handler */
  onLengthFilterChange?: (length: string) => void;
}

/* ==========================================================================*/
// Component
/* ==========================================================================*/

/**
 * DashboardDataTable
 *
 * Reusable table for displaying organization dashboard metrics.
 * Provides client-side search, multi-column filters and pagination.
 *
 * @param data - Dashboard metrics to display
 * @param availableUsers - Users available for filtering
 * @param organizationName - Organization name for summary display
 * @param onDateRangeChange - Handler for date range filter changes
 * @param onUserFilterChange - Handler for user filter changes
 * @param onLengthFilterChange - Handler for length filter changes
 */
function DashboardDataTable({
  data,
  summary,
}: DashboardDataTableProps) {
  /* -------------------------------- State -------------------------------- */
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  /* ---------------------------- Table instance --------------------------- */
  const table = useReactTable({
    data,
    columns: columns as ColumnDef<DashboardRowData>[],
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  /* ----------------------------- Render ---------------------------------- */

  return (
    <div className="w-full space-y-4">
      {/* Summary Bar --- */}
      {summary && (
        <div className="flex flex-wrap gap-6 items-center bg-muted/50 border border-border rounded-md px-4 py-2 mb-2">
          <div className="text-sm font-medium text-muted-foreground">
            <span className="font-semibold">Summary:</span>
          </div>
          <div className="text-sm">
            <span className="font-medium">Total Runs:</span> {summary.totalRuns.toLocaleString()}
          </div>
          <div className="text-sm">
            <span className="font-medium">Total Cost:</span> ${summary.totalCostUsd.toFixed(2)}
          </div>
          <div className="text-sm">
            <span className="font-medium">Avg Cost/Run:</span> ${summary.avgCostPerRun.toFixed(4)}
          </div>
        </div>
      )}
      {/* Data table */}
      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader className="bg-gray-100">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-center">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length && data.some(row => row.totalRuns > 0) ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/50">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="text-center">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No Runs Found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Pagination */}
      {/* Remove the Previous and Next pagination buttons below the table */}
    </div>
  );
}

/* ==========================================================================*/
// Exports
/* ==========================================================================*/

export { DashboardDataTable };

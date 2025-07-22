/* ==========================================================================*/
// columns.tsx — Column defs for DashboardDataTable
/* ==========================================================================*/
// Purpose: Defines TanStack column configuration for organization dashboard rows
// Sections: Imports, Types, Column Definitions, Exports
/* ==========================================================================*/

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// External Packages --------------------------------------------------------
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

// Local Modules ------------------------------------------------------------
import { Button } from "@/components/ui/button";

/* ==========================================================================*/
// Types
/* ==========================================================================*/

export interface DashboardRowData {
  organizationName: string;
  totalRuns: number;
  totalCostUsd: number;
  avgCostPerRun: number;
}

/* ==========================================================================*/
// Column Definitions
/* ==========================================================================*/

/** Compact, sortable column set for dashboard organization metrics. */
const columns: ColumnDef<DashboardRowData>[] = [
  /* --------------------------- Organization Name ------------------------- */
  {
    accessorKey: "organizationName",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-auto p-0 font-medium"
      >
        Organization <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex justify-center items-center w-full h-full text-center font-medium">
        {row.getValue<string>("organizationName")}
      </div>
    ),
    size: 280,
  },

  /* ----------------------------- Total Runs ----------------------------- */
  {
    accessorKey: "totalRuns",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-auto p-0 font-medium"
      >
        Total Articles <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-mono">
        {row.getValue<number>("totalRuns").toLocaleString()}
      </span>
    ),
    size: 120,
  },

  /* ----------------------------- Total Cost ----------------------------- */
  {
    accessorKey: "totalCostUsd",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-auto p-0 font-medium"
      >
        Total Cost (USD) <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.getValue<number>("totalCostUsd");
      return (
        <span className="font-mono text-green-600">
          ${typeof value === "number" && !isNaN(value) ? value.toFixed(2) : "0.00"}
        </span>
      );
    },
    size: 130,
  },

  /* ------------------------ Average Cost Per Run ------------------------ */
  {
    accessorKey: "avgCostPerRun",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-auto p-0 font-medium"
      >
        Average Cost Per Article <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.getValue<number>("avgCostPerRun");
      return (
        <span className="font-mono text-blue-600">
          ${typeof value === "number" && !isNaN(value) ? value.toFixed(4) : "0.0000"}
        </span>
      );
    },
    size: 150,
  },
];

/* ==========================================================================*/
// Exports
/* ==========================================================================*/

export { columns }; 
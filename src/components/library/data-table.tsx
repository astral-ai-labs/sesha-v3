"use client";

/* ==========================================================================*/
// ArticleDataTable.tsx — Data table for ArticleMetadata list
/* ==========================================================================*/
// Purpose: Display a pageable, searchable, filterable list of ArticleMetadata
//          items using TanStack React-Table and shadcn/ui components.
// Sections: Imports, Types, Component, Helpers, Exports
/* ==========================================================================*/

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// React core ---------------------------------------------------------------
import React from "react";

// External Packages --------------------------------------------------------
import { flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, type ColumnFiltersState, type SortingState, type VisibilityState, useReactTable, ColumnDef } from "@tanstack/react-table";
import { Search, Archive, ArchiveRestore, X } from "lucide-react";

// Local Modules ------------------------------------------------------------
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { ArticleMetadata } from "@/db/dal";
import { columns } from "./columns";
import { archiveArticleAction, unarchiveArticleAction } from "@/actions/article";

/* ==========================================================================*/
// Types
/* ==========================================================================*/

interface ArticleDataTableProps {
  /** Array of article metadata rows to render. */
  articles: ArticleMetadata[];
  /** Whether more articles are being loaded */
  isLoading?: boolean;
  /** Callback for article navigation */
  onArticleClick?: (slug: string, version: string) => void;
  /** Callback for when articles are archived/unarchived */
  onArticlesChanged?: () => void;
}

/* ==========================================================================*/
// Component
/* ==========================================================================*/

/**
 * ArticleDataTable
 *
 * Reusable table for displaying a list of ArticleMetadata.
 * Provides client-side search and multi-column filters.
 *
 * @param articles - Raw rows to display
 * @param isLoading - Whether more articles are being loaded
 */
function ArticleDataTable({ articles, isLoading = false, onArticleClick, onArticlesChanged }: ArticleDataTableProps) {

  /* -------------------------------- State -------------------------------- */
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "createdAt", desc: true } // Default sort by most recent
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [showArchived, setShowArchived] = React.useState(false);
  const [isArchiving, setIsArchiving] = React.useState(false);

  /* ---------------------------- Table instance --------------------------- */
  const filteredArticles = React.useMemo(() => {
    return showArchived 
      ? articles.filter(article => article.status === 'archived')
      : articles.filter(article => article.status !== 'archived');
  }, [articles, showArchived]);

  const table = useReactTable({
    data: filteredArticles,
    columns: columns as ColumnDef<ArticleMetadata>[],
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
  });

  /* ----------------------- Derived values / helpers ---------------------- */

  // Memoised set of unique creators for the "Created By" filter.
  const uniqueCreators = React.useMemo(() => {
    const creators = new Set(articles.map((row) => row.createdByName).filter(Boolean));
    return Array.from(creators).sort();
  }, [articles]);

  // Get selected article IDs
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedArticleIds = selectedRows.map(row => row.original.id);

  // Handle archive action
  const handleArchive = async () => {
    if (selectedArticleIds.length === 0) return;
    
    setIsArchiving(true);
    try {
      const promises = selectedArticleIds.map(id => archiveArticleAction(id));
      await Promise.all(promises);
      
      // Clear selection
      table.toggleAllRowsSelected(false);
      
      // Notify parent to refresh articles
      onArticlesChanged?.();
    } catch (error) {
      console.error('Failed to archive articles:', error);
    } finally {
      setIsArchiving(false);
    }
  };

  // Handle unarchive action
  const handleUnarchive = async () => {
    if (selectedArticleIds.length === 0) return;
    
    setIsArchiving(true);
    try {
      const promises = selectedArticleIds.map(id => unarchiveArticleAction(id));
      await Promise.all(promises);
      
      // Clear selection
      table.toggleAllRowsSelected(false);
      
      // Notify parent to refresh articles
      onArticlesChanged?.();
    } catch (error) {
      console.error('Failed to unarchive articles:', error);
    } finally {
      setIsArchiving(false);
    }
  };

  // Handle cancel/deselect all
  const handleCancel = () => {
    table.toggleAllRowsSelected(false);
  };

  // Handle row navigation on click.
  const handleRowClick = (row: ArticleMetadata, event: React.MouseEvent) => {
    // Prevent navigation if clicking on checkbox, input, button, or any interactive element
    const target = event.target as HTMLElement;
    const isInteractiveElement = (target instanceof HTMLInputElement && target.type === "checkbox") || target.tagName === "INPUT" || target.tagName === "BUTTON" || target.tagName === "A" || target.closest('input[type="checkbox"]') || target.closest("button") || target.closest("a");

    if (isInteractiveElement) {
      return;
    }

    // Use callback for navigation if provided
    if (onArticleClick) {
      onArticleClick(row.slug, row.versionDecimal);
    }
  };

  /* ----------------------------- Render ---------------------------------- */

  return (
    <div className="w-full space-y-4">
      {/* Search bar */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search articles…" value={(table.getColumn("slug")?.getFilterValue() as string) ?? ""} onChange={(e) => table.getColumn("slug")?.setFilterValue(e.target.value)} className="pl-10 w-full" />
      </div>

      {/* Filters and Actions */}
      <div className="flex items-center justify-between gap-3">
        {/* Created-by filter */}
        <Select value={(table.getColumn("createdByName")?.getFilterValue() as string) ?? ""} onValueChange={(value) => table.getColumn("createdByName")?.setFilterValue(value === "all" ? "" : value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Creators" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Creators</SelectItem>
            {uniqueCreators.map((creator) => (
              <SelectItem key={creator} value={creator!}>
                {creator}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Show/Hide Archived Toggle */}
          <Button
            variant={showArchived ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setShowArchived(!showArchived);
              // Clear selection when switching views
              table.toggleAllRowsSelected(false);
            }}
          >
            {showArchived ? "Hide Archived" : "Show Archived"}
          </Button>

          {/* Archive button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleArchive}
            disabled={selectedArticleIds.length === 0 || isArchiving || showArchived}
            className="flex items-center gap-1"
          >
            <Archive className="h-4 w-4" />
            Archive ({selectedArticleIds.length})
          </Button>

          {/* Unarchive button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleUnarchive}
            disabled={selectedArticleIds.length === 0 || isArchiving || !showArchived}
            className="flex items-center gap-1"
          >
            <ArchiveRestore className="h-4 w-4" />
            Unarchive ({selectedArticleIds.length})
          </Button>

          {/* Cancel button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={selectedArticleIds.length === 0}
            className="flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>

      {/* Data table */}
      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-[1100px]">
          <TableHeader className="bg-gray-100">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              <>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} onClick={(event) => handleRowClick(row.original, event)} className="cursor-pointer hover:bg-muted/50">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {showArchived ? "No archived articles found." : "No articles found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center py-4">
          <div className="text-sm text-muted-foreground">Loading more articles...</div>
        </div>
      )}

      {/* Status info */}

    </div>
  );
}

/* ==========================================================================*/
// Exports
/* ==========================================================================*/

export { ArticleDataTable };

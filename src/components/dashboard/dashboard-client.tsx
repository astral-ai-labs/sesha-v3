"use client";

/* ==========================================================================*/
// dashboard-client.tsx — Client component for dashboard run statistics
/* ==========================================================================*/
// Purpose: Handles filter state, data fetching, and rendering for the dashboard run statistics page.
// Sections: Imports, Types, Component, Exports
/* ==========================================================================*/

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// React core ---
import React from "react";

// Local Modules ---
import { getOrgSummariesAction, getOrgUsersAction, RunFilters } from "@/actions/dashboard";
import { DashboardFilters } from "./filters";
import { DashboardDataTable } from "./data-table";
import type { LengthRange } from "@/db/schema";
// OrgSummary type for dashboard summaries
export type OrgSummary = {
  orgId: number;
  organizationName: string;
  totalRuns: number;
  totalCostUsd: number;
  avgCostPerRun: number;
};

/* ==========================================================================*/
// Types
/* ==========================================================================*/

interface DashboardClientProps {
  orgName: string;
  orgId: number;
}

/* ==========================================================================*/
// Component
/* ==========================================================================*/

/**
 * DashboardClient
 *
 * Client component for the dashboard run statistics page. Manages filter state,
 * fetches run data and summary statistics, and renders the data table and filters.
 *
 * @param orgId - Organization ID
 * @param organizationName - Name of the organization
 */
export function DashboardClient({ orgName, orgId }: DashboardClientProps) {
  // ----------------------------- State -----------------------------------
  const [filters, setFilters] = React.useState<RunFilters>({ timeRange: "all" });
  const [pendingFilters, setPendingFilters] = React.useState<RunFilters>({ timeRange: "all" });
  const [summaries, setSummaries] = React.useState<OrgSummary[]>([]); // Use OrgSummary type
  const [users, setUsers] = React.useState<{id: string; name: string; email: string}[]>([]); // Use User type
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch org users once on mount or when orgId changes
  React.useEffect(() => {
    async function fetchOrgUsers() {
      try {
        const orgUsers = await getOrgUsersAction(orgId);
        // Local type for raw user objects returned from getOrgUsersAction
        type RawUser = { id: string | number; name: string | null; email: string };
        setUsers(orgUsers.map((u: RawUser) => ({ id: String(u.id), name: u.name ?? u.email ?? "", email: u.email }))); // Ensure id and name are string
      } catch {
        setError("Failed to load users for this organization.");
      }
    }
    fetchOrgUsers();
  }, [orgId]);

  // -------------------------- Data Fetching ------------------------------
  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch org summaries for the current org only
      const summariesData = await getOrgSummariesAction({ ...filters, orgId });
      setSummaries(summariesData);
    } catch {
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [filters, orgId]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -------------------------- Filter Handlers ----------------------------
  function handleApplyFilters(appliedFilters: {
    timeRange?: RunFilters["timeRange"];
    userId?: string;
    length?: string;
    sourceType?: "single" | "multi";
  }) {
    const newFilters = {
      ...appliedFilters,
      length: appliedFilters.length as LengthRange | undefined,
    };
    setFilters(newFilters);
    setPendingFilters(newFilters); // sync UI with applied filters
  }

  // Map OrgSummary to DashboardRowData for the data table
  const dashboardRows = summaries.map((summary) => ({
    organizationName: summary.organizationName,
    totalRuns: summary.totalRuns,
    totalCostUsd: summary.totalCostUsd, // match column accessorKey
    avgCostPerRun: summary.avgCostPerRun, // match column accessorKey and type
  }));

  // Map User[] to {id, name}[] for the users prop
  const userOptions = users.map((user) => ({
    id: user.id,
    name: user.name ?? user.email ?? "",
  }));

  // ----------------------------- Render ----------------------------------
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading dashboard data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-sm text-destructive">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters Section --- */}
      <div className="mt-6">
        <DashboardFilters
          filters={pendingFilters}
          users={users}
          onChange={handleApplyFilters}
        />
      </div>
      {/* Organization Name --- */}
      {orgName && (
        <div className="text-sm font-medium text-muted-foreground mb-2">
          Organization: {orgName}
        </div>
      )}
      {/* Data Table Section --- */}
      <DashboardDataTable
        data={dashboardRows}
        users={userOptions}
      />
    </div>
  );
}

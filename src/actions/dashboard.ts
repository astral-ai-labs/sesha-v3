"use server";

/* ==========================================================================*/
// dashboard.ts — Server actions for dashboard run statistics
/* ==========================================================================*/
// Purpose: Exposes server actions to fetch run data, summary statistics, and users for the dashboard page.
// Sections: Imports, Types, Actions, Exports
/* ==========================================================================*/

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// Local Modules ---
import { getOrgRunsWithUserAndOrgData, getOrgRunsSummary, getOrgUsers, getOrgSummariesWithFilters } from "@/db/dal";
import type { LengthRange } from "@/db/schema";

/* ==========================================================================*/
// Types
/* ==========================================================================*/

// TODO: Move to src/types/dashboard.ts when created
export interface RunFilters {
  timeRange?: "today" | "week" | "month" | "year" | "all";
  userId?: string;
  length?: LengthRange;
  sourceType?: "single" | "multi";
  orgId?: number;
}

/* ==========================================================================*/
// Actions
/* ==========================================================================*/

/**
 * getOrgSummariesAction
 *
 * Fetches summary data for all organizations matching the filters.
 *
 * @param filters - Run filter parameters (time range, user, length, type)
 * @returns Array of org summary objects
 */
export async function getOrgSummariesAction(filters: RunFilters) {
  return await getOrgSummariesWithFilters(filters);
}

/**
 * getOrgRunsAction
 *
 * Fetches filtered run data for an organization, including user and org info.
 *
 * @param orgId - Organization ID
 * @param filters - Run filter parameters (time range, user, length, type)
 * @returns Array of runs with user and org info
 */
export async function getOrgRunsAction(orgId: number, filters: RunFilters) {
  return await getOrgRunsWithUserAndOrgData(orgId, filters);
}

/**
 * getOrgRunsSummaryAction
 *
 * Fetches summary statistics for runs in an organization, filtered by parameters.
 *
 * @param orgId - Organization ID
 * @param filters - Run filter parameters
 * @returns Summary statistics (total runs, total cost, avg cost per run)
 */
export async function getOrgRunsSummaryAction(orgId: number, filters: RunFilters) {
  return await getOrgRunsSummary(orgId, filters);
}

/**
 * getOrgUsersAction
 *
 * Fetches all users in an organization for use in filter dropdowns.
 *
 * @param orgId - Organization ID
 * @returns Array of users (id, name)
 */
export async function getOrgUsersAction(orgId: number) {
  return await getOrgUsers(orgId);
}

/* ==========================================================================*/
// filters.tsx — Dashboard filter controls for run statistics
/* ==========================================================================*/
// Purpose: Renders filter dropdowns and an apply button for dashboard run statistics.
// Sections: Imports, Types, Component, Exports
/* ==========================================================================*/

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// React core ---
import React from "react";

// Local Modules ---
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
// (Assume these are available in the project)

/* ==========================================================================*/
// Types
/* ==========================================================================*/

interface UserOption {
  id: string;
  name: string;
}

interface DashboardFiltersProps {
  filters: {
    timeRange?: "today" | "week" | "month" | "year" | "all";
    userId?: string;
    length?: string;
    sourceType?: "single" | "multi";
  };
  users: UserOption[];
  onChange: (filters: DashboardFiltersProps["filters"]) => void;
}

const TIME_RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "all", label: "All Time" },
];

const LENGTH_OPTIONS = [
  { value: "100-250", label: "100-250" },
  { value: "400-550", label: "400-550" },
  { value: "700-850", label: "700-850" },
  { value: "1000-1200", label: "1000-1200" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "single", label: "Digests" },
  { value: "multi", label: "Aggregations" },
];

/* ==========================================================================*/
// Component
/* ==========================================================================*/

/**
 * DashboardFilters
 *
 * Renders filter dropdowns and an apply button for dashboard run statistics.
 *
 * @param filters - Current filter values
 * @param users - List of users for the user filter
 * @param onChange - Callback to apply filters
 */
export function DashboardFilters({ filters, users, onChange }: DashboardFiltersProps) {
  // Local state for filter selection
  const [localFilters, setLocalFilters] = React.useState(filters);

  // Sync local state with parent filters when they change (after Apply)
  React.useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  function handleSelectChange(key: keyof typeof localFilters, value: string) {
    setLocalFilters((prev) => ({ ...prev, [key]: value === "all" ? undefined : value }));
  }

  function handleApply() {
    onChange(localFilters);
  }

  return (
    <div className="flex items-center justify-between pb-2 w-full">
      {/* Left group: Time Range and User */}
      <div className="flex items-center gap-3">
        {/* Time Range Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">Time Range:</label>
          <Select value={localFilters.timeRange || "all"} onValueChange={v => handleSelectChange("timeRange", v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* User Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">User:</label>
          <Select value={localFilters.userId || "all"} onValueChange={v => handleSelectChange("userId", v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Right group: Length, Type, Apply */}
      <div className="flex items-center gap-3">
        {/* Length Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">Length:</label>
          <Select value={localFilters.length || "all"} onValueChange={v => handleSelectChange("length", v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Lengths" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Lengths</SelectItem>
              {LENGTH_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">Type:</label>
          <Select value={localFilters.sourceType || "all"} onValueChange={v => handleSelectChange("sourceType", v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Apply Button */}
        <div className="flex flex-col justify-end h-full">
          <Button onClick={handleApply} variant="default">Apply</Button>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================*/
// Exports
/* ==========================================================================*/

// (Exported above)

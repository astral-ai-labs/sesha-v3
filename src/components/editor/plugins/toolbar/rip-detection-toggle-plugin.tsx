"use client";

/* ==========================================================================*/
// rip-detection-toggle-plugin.tsx — Rip detection visibility toggle for toolbar
/* ==========================================================================*/
// Purpose: Toggle button to show/hide rip detection highlights in the editor
// Sections: Imports, Component, Exports

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// React core ---
import React from "react";

// Lucide Icons ---
import { Eye, EyeOff } from "lucide-react";

// UI Components ---
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/* ==========================================================================*/
// Component
/* ==========================================================================*/

interface RipDetectionTogglePluginProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  hasRipData: boolean;
}

/**
 * RipDetectionTogglePlugin
 *
 * Toggle button to control visibility of rip detection highlights.
 * Only shows when article has rip detection data.
 */
export function RipDetectionTogglePlugin({ 
  isEnabled, 
  onToggle, 
  hasRipData 
}: RipDetectionTogglePluginProps) {
  
  // Don't render if no rip data available
  if (!hasRipData) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle
          pressed={isEnabled}
          onPressedChange={onToggle}
          size="sm"
          aria-label={`${isEnabled ? 'Hide' : 'Show'} plagiarism detection highlights`}
          className="h-8 w-8 p-0"
        >
          {isEnabled ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
        </Toggle>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isEnabled ? 'Hide' : 'Show'} plagiarism detection</p>
      </TooltipContent>
    </Tooltip>
  );
}

/* ==========================================================================*/
// Public Component Exports
/* ==========================================================================*/

export default RipDetectionTogglePlugin;
